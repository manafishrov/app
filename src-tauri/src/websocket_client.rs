use crate::models::config::Config;
use futures_util::stream::SplitSink;
use futures_util::{SinkExt, StreamExt};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use tokio_tungstenite::{
  connect_async, tungstenite::protocol::Message, MaybeTlsStream, WebSocketStream,
};

pub struct WebSocketClient {
  write: Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
  is_connected: Arc<AtomicBool>,
  last_heartbeat: Arc<AtomicU64>,
}

impl WebSocketClient {
  pub async fn new(config: &Config) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
    let url = format!("ws://{}:{}", config.ip, config.control_port);
    let (ws_stream, _) = connect_async(url).await?;
    let (write, read) = ws_stream.split();
    let write = Arc::new(Mutex::new(write));
    let is_connected = Arc::new(AtomicBool::new(true));
    let last_heartbeat = Arc::new(AtomicU64::new(
      SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs(),
    ));

    let is_connected_clone = is_connected.clone();
    let last_heartbeat_clone = last_heartbeat.clone();

    let _read_task = tokio::spawn(async move {
      let mut read_stream = read;
      while let Some(message) = read_stream.next().await {
        match message {
          Ok(Message::Text(text)) => {
            if text == "heartbeat" {
              last_heartbeat_clone.store(
                SystemTime::now()
                  .duration_since(UNIX_EPOCH)
                  .unwrap()
                  .as_secs(),
                Ordering::SeqCst,
              );
            } else {
              println!("Received from drone: {}", text);
            }
          }
          Err(e) => {
            eprintln!("WebSocket error: {}", e);
            is_connected_clone.store(false, Ordering::SeqCst);
            break;
          }
          _ => {}
        }
      }
      is_connected_clone.store(false, Ordering::SeqCst);
    });

    Ok(WebSocketClient {
      write,
      is_connected,
      last_heartbeat,
    })
  }

  pub async fn emergency_stop(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut write = self.write.lock().await;
    write
      .send(Message::Text("EMERGENCY_STOP".to_string()))
      .await?;
    let zero_input = [0.0; 6];
    let json = serde_json::to_string(&zero_input)?;
    write.send(Message::Text(json)).await?;
    println!("Emergency stop triggered!");
    Ok(())
  }

  pub async fn send_input(
    &self,
    input_array: [f32; 6],
  ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if !self.is_connected.load(Ordering::SeqCst) {
      self.emergency_stop().await?;
      return Err("WebSocket disconnected - Emergency stop triggered".into());
    }

    let now = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap()
      .as_secs();
    if now - self.last_heartbeat.load(Ordering::SeqCst) > 3 {
      self.emergency_stop().await?;
      self.is_connected.store(false, Ordering::SeqCst);
      return Err("Connection timeout - Emergency stop triggered".into());
    }

    let json = serde_json::to_string(&input_array)?;
    let mut write = self.write.lock().await;
    write.send(Message::Text(json)).await?;
    Ok(())
  }
}

pub fn spawn_websocket_client(
  config: Config,
  rt: tokio::runtime::Handle,
) -> Arc<Mutex<Option<WebSocketClient>>> {
  let client = Arc::new(Mutex::new(None));
  let client_clone = client.clone();

  rt.spawn(async move {
    loop {
      match WebSocketClient::new(&config).await {
        Ok(ws_client) => {
          let mut client = client_clone.lock().await;
          *client = Some(ws_client);
          println!("Successfully connected to drone");

          while client.as_ref().unwrap().is_connected.load(Ordering::SeqCst) {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
          }

          if let Some(client) = client.as_ref() {
            if let Err(e) = client.emergency_stop().await {
              eprintln!("Failed to execute emergency stop: {}", e);
            }
          }

          println!("Connection to drone lost, attempting to reconnect...");
          *client = None;
        }
        Err(e) => {
          eprintln!("Failed to connect to drone: {}", e);
          tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        }
      }
    }
  });

  client
}

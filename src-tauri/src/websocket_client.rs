use crate::commands::config::get_config;
use crate::models::config::Config;
use futures_util::{SinkExt, StreamExt};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::mpsc::{channel, Receiver};
use tokio::time::Duration;
use tokio_tungstenite::{connect_async, tungstenite::Message};

pub static CONNECTION_STATUS: AtomicBool = AtomicBool::new(false);
pub static WATER_SENSOR_STATUS: AtomicBool = AtomicBool::new(false);
pub static LAST_HEARTBEAT: AtomicI64 = AtomicI64::new(0);
pub static CURRENT_CONFIG: Lazy<Mutex<Config>> =
  Lazy::new(|| Mutex::new(get_config().unwrap_or_default()));

#[derive(Serialize, Deserialize)]
enum MessageType {
  Command,
  Heartbeat,
  ControlInput,
  Status,
}

#[derive(Serialize, Deserialize)]
struct WebSocketMessage<T> {
  message_type: MessageType,
  payload: T,
}

#[derive(Serialize, Deserialize)]
struct StatusPayload {
  water_sensor_status: bool,
}

#[derive(Serialize, Deserialize)]
struct HeartbeatPayload {
  timestamp: Option<i64>,
}

pub fn create_input_channel() -> (
  tokio::sync::mpsc::Sender<[f32; 6]>,
  tokio::sync::mpsc::Receiver<[f32; 6]>,
) {
  channel(1)
}

pub async fn start_websocket_client(mut input_rx: Receiver<[f32; 6]>) {
  loop {
    CONNECTION_STATUS.store(false, Ordering::Relaxed);
    if let Err(e) = connect_and_handle(&mut input_rx).await {
      if !e.to_string().contains("Connection reset") {
        println!("WebSocket error: {}", e);
      }
    }
    tokio::time::sleep(Duration::from_secs(3)).await;
  }
}

async fn connect_and_handle(
  input_rx: &mut Receiver<[f32; 6]>,
) -> Result<(), Box<dyn std::error::Error>> {
  let url = {
    let config = CURRENT_CONFIG.lock().map_err(|e| e.to_string())?;
    format!("ws://{}:{}", config.ip_address, config.device_controls_port)
  };

  println!("Connecting to Cyberfish WebSocket server at {}", url);
  let (ws_stream, _) = connect_async(url).await?;
  CONNECTION_STATUS.store(true, Ordering::Relaxed);

  LAST_HEARTBEAT.store(
    SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap_or_default()
      .as_secs() as i64,
    Ordering::Relaxed,
  );

  let (mut write, mut read) = ws_stream.split();

  let handshake = WebSocketMessage {
    message_type: MessageType::Command,
    payload: "connect",
  };
  write
    .send(Message::Text(serde_json::to_string(&handshake)?.into()))
    .await?;

  let heartbeat_monitor = tokio::spawn(async move {
    loop {
      tokio::time::sleep(Duration::from_secs(5)).await;
      let last_heartbeat = LAST_HEARTBEAT.load(Ordering::Relaxed);
      let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

      if now - last_heartbeat > 5 {
        CONNECTION_STATUS.store(false, Ordering::Relaxed);
        return;
      }
    }
  });

  loop {
    tokio::select! {
      Some(message) = read.next() => {
        match message {
          Ok(msg) => {
            if msg.is_text() {
              let text = msg.into_text()?;

              if let Ok(heartbeat_msg) = serde_json::from_str::<WebSocketMessage<HeartbeatPayload>>(&text) {
                if matches!(heartbeat_msg.message_type, MessageType::Heartbeat) {
                  LAST_HEARTBEAT.store(
                    SystemTime::now()
                      .duration_since(UNIX_EPOCH)
                      .unwrap_or_default()
                      .as_secs() as i64,
                    Ordering::Relaxed
                  );

                  let response = WebSocketMessage {
                    message_type: MessageType::Heartbeat,
                    payload: HeartbeatPayload { timestamp: None },
                  };
                  write.send(Message::Text(serde_json::to_string(&response)?.into())).await?;
                }
              }
              else if let Ok(status_msg) = serde_json::from_str::<WebSocketMessage<StatusPayload>>(&text) {
                if matches!(status_msg.message_type, MessageType::Status) {
                  WATER_SENSOR_STATUS.store(status_msg.payload.water_sensor_status, Ordering::Relaxed);
                }
              }
            }
          }
          Err(_) => break,
        }
      }
      Some(input) = input_rx.recv() => {
        let structured_msg = WebSocketMessage {
          message_type: MessageType::ControlInput,
          payload: input,
        };
        let msg_json = serde_json::to_string(&structured_msg)?;
        write.send(Message::Text(msg_json.into())).await?;
      }
      else => break,
    }
  }

  heartbeat_monitor.abort();
  CONNECTION_STATUS.store(false, Ordering::Relaxed);
  Ok(())
}

pub fn update_config(new_config: &Config) {
  if let Ok(mut config) = CURRENT_CONFIG.lock() {
    *config = new_config.clone();
  }
}

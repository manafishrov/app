use crate::commands::config::get_config;
use crate::models::config::Config;
use futures_util::{SinkExt, StreamExt};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tokio::sync::mpsc::{channel, Receiver};
use tokio::time::Duration;
use tokio_tungstenite::{connect_async, tungstenite::Message};

pub static CONNECTION_STATUS: AtomicBool = AtomicBool::new(false);
pub static WATER_SENSOR_STATUS: AtomicBool = AtomicBool::new(false);
pub static CURRENT_CONFIG: Lazy<Mutex<Config>> =
  Lazy::new(|| Mutex::new(get_config().unwrap_or_default()));

#[derive(Serialize, Deserialize)]
enum MessageType {
  ControlInput,
  Command,
  StatusRequest,
}

#[derive(Serialize, Deserialize)]
struct WebSocketMessage<T> {
  message_type: MessageType,
  payload: T,
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
    tokio::time::sleep(Duration::from_secs(5)).await;
  }
}

async fn connect_and_handle(
  input_rx: &mut Receiver<[f32; 6]>,
) -> Result<(), Box<dyn std::error::Error>> {
  let url = {
    let config = CURRENT_CONFIG.lock().map_err(|e| e.to_string())?;
    format!("ws://{}:{}", config.ip, config.control_port)
  };

  println!("Connecting to WebSocket at {}", url);
  let (ws_stream, _) = connect_async(url).await?;
  println!("Successfully connected to WebSocket server");
  CONNECTION_STATUS.store(true, Ordering::Relaxed);

  let (mut write, mut read) = ws_stream.split();

  let handshake = WebSocketMessage {
    message_type: MessageType::Command,
    payload: "connect",
  };
  write
    .send(Message::Text(serde_json::to_string(&handshake)?.into()))
    .await?;

  loop {
    tokio::select! {
        Some(message) = read.next() => {
            match message {
                Ok(msg) => {
                    if msg.is_text() {
                        let text = msg.into_text()?;
                        if let Ok(data) = serde_json::from_str::<serde_json::Value>(&text) {
                            if let Some(status) = data.get("waterSensorStatus") {
                                if let Some(status) = status.as_bool() {
                                    WATER_SENSOR_STATUS.store(status, Ordering::Relaxed);
                                }
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

  CONNECTION_STATUS.store(false, Ordering::Relaxed);
  Ok(())
}

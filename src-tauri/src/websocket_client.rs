use crate::commands::config::get_config;
use crate::input_handler;
use crate::models::config::Config;
use futures_util::{SinkExt, StreamExt};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::mpsc::{channel, Receiver, Sender};
use tokio::time::timeout;
use tokio_tungstenite::{connect_async, tungstenite::Message};

pub static CONNECTION_STATUS: AtomicBool = AtomicBool::new(false);
pub static WATER_SENSOR_STATUS: AtomicBool = AtomicBool::new(false);
pub static LAST_HEARTBEAT: AtomicI64 = AtomicI64::new(0);

static CURRENT_CONFIG: Lazy<Arc<Mutex<Config>>> =
  Lazy::new(|| Arc::new(Mutex::new(get_config().unwrap_or_default())));

static SHUTDOWN_SIGNAL: Lazy<Arc<AtomicBool>> = Lazy::new(|| Arc::new(AtomicBool::new(false)));

#[derive(Serialize, Deserialize, Debug)]
enum MessageType {
  Command,
  Heartbeat,
  ControlInput,
  Status,
}

#[derive(Serialize, Deserialize, Debug)]
struct WebSocketMessage<T> {
  message_type: MessageType,
  payload: T,
}

#[derive(Serialize, Deserialize, Debug)]
struct StatusPayload {
  water_sensor_status: bool,
}

#[derive(Serialize, Deserialize, Debug)]
struct HeartbeatPayload {
  timestamp: Option<i64>,
}

pub fn create_input_channel() -> (Sender<[f32; 6]>, Receiver<[f32; 6]>) {
  channel(1)
}

pub async fn start_websocket_client(mut input_rx: Receiver<[f32; 6]>) {
  println!("WebSocket client starting...");
  let shutdown_clone = Arc::clone(&SHUTDOWN_SIGNAL);

  while !shutdown_clone.load(Ordering::Relaxed) {
    CONNECTION_STATUS.store(false, Ordering::Relaxed);
    let config = {
      match CURRENT_CONFIG.lock() {
        Ok(guard) => guard.clone(),
        Err(e) => {
          eprintln!("Failed to lock config mutex for WS: {}. Using default.", e);
          Config::default()
        }
      }
    };

    let url = format!("ws://{}:{}", config.ip_address, config.device_controls_port);
    println!("Attempting to connect to WebSocket: {}", url);

    match connect_and_handle(&mut input_rx, &url, Arc::clone(&shutdown_clone)).await {
      Ok(_) => {
        println!("WebSocket connection closed gracefully.");
      }
      Err(e) => {
        let err_str = e.to_string();
        if !err_str.contains("Connection reset by peer")
          && !err_str.contains("Connection refused")
          && !err_str.contains("timed out")
          && !err_str.contains("No route to host")
          && !err_str.contains("Network is unreachable")
        {
          eprintln!("WebSocket error: {}", e);
        }
        CONNECTION_STATUS.store(false, Ordering::Relaxed);
        WATER_SENSOR_STATUS.store(false, Ordering::Relaxed);
      }
    }

    if shutdown_clone.load(Ordering::Relaxed) {
      break;
    }

    println!("WebSocket disconnected. Retrying in 3 seconds...");
    tokio::time::sleep(Duration::from_secs(3)).await;
  }

  println!("WebSocket client finished.");
}

pub fn shutdown_websocket_client() {
  println!("Signaling WebSocket client to shut down...");
  SHUTDOWN_SIGNAL.store(true, Ordering::Relaxed);
}

pub fn update_config(new_config: &Config) {
  if let Ok(mut config_guard) = CURRENT_CONFIG.lock() {
    *config_guard = new_config.clone();
    input_handler::update_config(new_config);
  }
}
async fn connect_and_handle(
  input_rx: &mut Receiver<[f32; 6]>,
  url: &str,
  shutdown_signal: Arc<AtomicBool>,
) -> Result<(), Box<dyn std::error::Error>> {
  let connect_timeout = Duration::from_secs(5);
  let (ws_stream, _) = timeout(connect_timeout, connect_async(url)).await??;
  println!("WebSocket connected successfully to {}", url);
  CONNECTION_STATUS.store(true, Ordering::Relaxed);

  LAST_HEARTBEAT.store(
    SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64,
    Ordering::Relaxed,
  );

  let (mut write, mut read) = ws_stream.split();

  let handshake = WebSocketMessage {
    message_type: MessageType::Command,
    payload: "connect",
  };
  let handshake_json = serde_json::to_string(&handshake)?;
  println!("Sending handshake: {}", handshake_json);
  write.send(Message::Text(handshake_json.into())).await?;

  let heartbeat_monitor = tokio::spawn(async move {
    let check_interval = Duration::from_secs(1);
    let timeout_duration: i64 = 10;

    loop {
      tokio::time::sleep(check_interval).await;
      let last_heartbeat = LAST_HEARTBEAT.load(Ordering::Relaxed);
      let now = match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(d) => d.as_secs() as i64,
        Err(_) => 0,
      };

      if now > 0 && now.saturating_sub(last_heartbeat) > timeout_duration {
        println!("Heartbeat timeout detected ({}s)", timeout_duration);
        CONNECTION_STATUS.store(false, Ordering::Relaxed);
        break;
      }
    }
  });

  loop {
    if shutdown_signal.load(Ordering::Relaxed) {
      println!("Shutdown signal received in connect_and_handle.");
      break;
    }

    tokio::select! {
        biased;
        _ = tokio::time::sleep(Duration::from_millis(1)), if shutdown_signal.load(Ordering::Relaxed) => {
            println!("Shutdown detected during select.");
            break;
        }

        Some(message) = read.next() => {
            match message {
                Ok(msg) => {
                    if msg.is_text() {
                        let text = msg.into_text()?;

                        if let Ok(heartbeat_msg) = serde_json::from_str::<WebSocketMessage<HeartbeatPayload>>(&text) {
                            if matches!(heartbeat_msg.message_type, MessageType::Heartbeat) {
                                LAST_HEARTBEAT.store(
                                    SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64,
                                    Ordering::Relaxed
                                );
                                let response = WebSocketMessage {
                                    message_type: MessageType::Heartbeat,
                                    payload: HeartbeatPayload { timestamp: None },
                                };
                                let response_json = serde_json::to_string(&response)?;
                                if let Err(e) = write.send(Message::Text(response_json.into())).await {
                                    eprintln!("Failed to send heartbeat response: {}", e);
                                    break;
                                }
                            }
                        }
                        else if let Ok(status_msg) = serde_json::from_str::<WebSocketMessage<StatusPayload>>(&text) {
                            if matches!(status_msg.message_type, MessageType::Status) {
                                WATER_SENSOR_STATUS.store(status_msg.payload.water_sensor_status, Ordering::Relaxed);
                            }
                        } else {
                            println!("Received unhandled text message: {}", text);
                        }
                    } else if msg.is_close() {
                        println!("Received Close frame");
                        break;
                    }
                }
                Err(e) => {
                    eprintln!("WebSocket read error: {}", e);
                    break;
                }
            }
        }

        Some(input) = input_rx.recv() => {
            let control_msg = WebSocketMessage {
                message_type: MessageType::ControlInput,
                payload: input,
            };
            let msg_json = serde_json::to_string(&control_msg)?;
            if let Err(e) = write.send(Message::Text(msg_json.into())).await {
                eprintln!("WebSocket write error: {}", e);
                break;
            }
        }
        else => {
            println!("Input channel closed, exiting WebSocket handler.");
            break;
        }
    }
  }

  heartbeat_monitor.abort();
  CONNECTION_STATUS.store(false, Ordering::Relaxed);
  println!("Exiting connect_and_handle for {}", url);
  Ok(())
}

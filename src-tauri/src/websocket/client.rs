use super::handler::handle_message;
use super::message::WebsocketMessage;
use crate::commands::config::get_config;
use crate::models::config::Config;
use futures_util::{SinkExt, StreamExt};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc::{self, Receiver};
use tokio::time::{interval, sleep, timeout};
use tokio_tungstenite::{connect_async, tungstenite::Message};

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct WebSocketConnection {
  is_connected: bool,
  delay: Option<u128>,
}

pub struct MessageSendChannelState {
  pub tx: mpsc::Sender<WebsocketMessage>,
}

pub async fn start_websocket_client(
  app: AppHandle,
  mut config_rx: Receiver<Config>,
  mut message_rx: Receiver<WebsocketMessage>,
) {
  let mut config = get_config().unwrap_or_default();

  loop {
    let url = format!("ws://{}:{}", config.ip_address, config.web_socket_port);
    let connect_timeout = Duration::from_secs(5);

    eprintln!("Attempting to connect to {}", url);
    let ws_stream = match timeout(connect_timeout, connect_async(&url)).await {
      Ok(Ok((stream, _))) => {
        eprintln!("Successfully connected to {}", url);
        stream
      }
      Ok(Err(e)) => {
        eprintln!("WebSocket connect error: {}. Retrying...", e);
        app
          .emit(
            "websocket_connection",
            WebSocketConnection {
              is_connected: false,
              delay: None,
            },
          )
          .unwrap();
        if let Some(new_config) = wait_before_retry(&mut config_rx).await {
          config = new_config;
        }
        continue;
      }
      Err(_) => {
        eprintln!("WebSocket connect timeout. Retrying...");
        app
          .emit(
            "websocket_connection",
            WebSocketConnection {
              is_connected: false,
              delay: None,
            },
          )
          .unwrap();
        if let Some(new_config) = wait_before_retry(&mut config_rx).await {
          config = new_config;
        }
        continue;
      }
    };

    let (mut write, mut read) = ws_stream.split();

    let ping_interval_duration = Duration::from_secs(2);
    let mut ping_timer = interval(ping_interval_duration);
    ping_timer.tick().await;

    loop {
      tokio::select! {
          Some(new_config) = config_rx.recv() => {
              config = new_config;
              eprintln!("Config updated. Reconnecting websocket.");
              app.emit("websocket_connection", WebSocketConnection { is_connected: false, delay: None }).unwrap();
              break;
          }
          Some(message_to_send) = message_rx.recv() => {
              let message_text = match serde_json::to_string(&message_to_send) {
                Ok(text) => text,
                Err(e) => {
                  eprintln!("Failed to serialize message: {}", e);
                  continue;
                }
              };

              if let Err(e) = write.send(Message::Text(message_text.into())).await {
                  eprintln!("Websocket send error: {}. Reconnecting...", e);
                  app.emit("websocket_connection", WebSocketConnection { is_connected: false, delay: None }).unwrap();
                  break;
              }
          }
          _ = ping_timer.tick() => {
              let timestamp_ms = SystemTime::now()
                  .duration_since(UNIX_EPOCH)
                  .unwrap_or_default()
                  .as_millis();
              let ping_data = timestamp_ms.to_string().into_bytes();

              if let Err(e) = write.send(Message::Ping(ping_data.into())).await {
                  eprintln!("Failed to send ping: {}. Reconnecting...", e);
                  app.emit("websocket_connection", WebSocketConnection { is_connected: false, delay: None }).unwrap();
                  break;
              }
              eprintln!("Sent Ping with timestamp: {}", timestamp_ms);
          }
          Some(message) = read.next() => {
              match message {
                  Ok(msg) => {
                      if msg.is_text() || msg.is_binary() {
                          if let Some(response) = handle_message(&app, msg).await {
                              if let Err(e) = write.send(response).await {
                                  eprintln!("Websocket send error: {}. Reconnecting...", e);
                                  app.emit("websocket_connection", WebSocketConnection { is_connected: false, delay: None }).unwrap();
                                  break;
                              }
                          }
                      } else if msg.is_close() {
                          eprintln!("Websocket connection closed by peer. Reconnecting...");
                          app.emit("websocket_connection", WebSocketConnection { is_connected: false, delay: None }).unwrap();
                          break;
                      }
                      else if msg.is_pong() {
                          if let Ok(timestamp_str) = String::from_utf8(msg.into_data().to_vec()) {
                              if let Ok(sent_timestamp_ms) = timestamp_str.parse::<u128>() {
                                  let now_ms = SystemTime::now().duration_since(UNIX_EPOCH)
                                      .unwrap_or_default().as_millis();
                                  let rtt = now_ms.saturating_sub(sent_timestamp_ms);
                                  app.emit("websocket_connection", WebSocketConnection {
                                      is_connected: true,
                                      delay: Some(rtt),
                                  }).unwrap();
                              }
                          }
                      }
                  }
                  Err(e) => {
                      eprintln!("Websocket read error: {}. Reconnecting...", e);
                      app.emit("websocket_connection", WebSocketConnection { is_connected: false, delay: None }).unwrap();
                      break;
                  }
              }
          }
      }
    }
  }
}

async fn wait_before_retry(rx: &mut Receiver<Config>) -> Option<Config> {
  eprintln!("Waiting 3 seconds or for config update before retrying...");
  tokio::select! {
      Some(new_config) = rx.recv() => {
          eprintln!("Config updated, retrying immediately.");
          Some(new_config)
      },
      _ = sleep(Duration::from_secs(3)) => {
          eprintln!("3 seconds passed, retrying connection.");
          None
      }
  }
}

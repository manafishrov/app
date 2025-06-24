use super::handler::handle_message;
use crate::commands::config::get_config;
use crate::models::config::Config;
use futures_util::{SinkExt, StreamExt};
use std::time::Duration;
use tauri::AppHandle;
use tokio::sync::mpsc::{self, Receiver};
use tokio::time::timeout;
use tokio_tungstenite::{connect_async, tungstenite::Message};

pub struct MessageSendChannelState {
  pub tx: mpsc::Sender<Message>,
}

pub async fn start_websocket_client(
  app: AppHandle,
  mut config_rx: Receiver<Config>,
  mut message_rx: Receiver<Message>,
) {
  let mut config = get_config().unwrap_or_default();

  loop {
    let url = format!("ws://{}:{}", config.ip_address, config.web_socket_port);
    let connect_timeout = Duration::from_secs(5);

    let ws_stream = match timeout(connect_timeout, connect_async(&url)).await {
      Ok(Ok((stream, _))) => stream,
      Ok(Err(e)) => {
        eprintln!("WebSocket connect error: {}. Retrying...", e);
        wait_before_retry(&mut config_rx).await;
        continue;
      }
      Err(_) => {
        eprintln!("WebSocket connect timeout. Retrying...");
        wait_before_retry(&mut config_rx).await;
        continue;
      }
    };

    let (mut write, mut read) = ws_stream.split();

    loop {
      tokio::select! {
          Some(new_config) = config_rx.recv() => {
              config = new_config;
              eprintln!("Config updated. Reconnecting websocket.");
              break;
          }
          Some(message_to_send) = message_rx.recv() => {
              if let Err(e) = write.send(message_to_send).await {
                  eprintln!("Websocket send error: {}", e);
                  break;
              }
          }
          Some(message) = read.next() => {
              match message {
                  Ok(msg) => {
                      if msg.is_text() || msg.is_binary() {
                          if let Some(response) = handle_message(&app, msg).await {
                              if let Err(e) = write.send(response).await {
                                  eprintln!("Websocket send error: {}", e);
                                  break;
                              }
                          }
                      } else if msg.is_close() {
                          eprintln!("Websocket connection closed.");
                          break;
                      }
                  }
                  Err(e) => {
                      eprintln!("Websocket read error: {}", e);
                      break;
                  }
              }
          }
      }
    }
  }
}

async fn wait_before_retry(rx: &mut Receiver<Config>) {
  tokio::select! {
      Some(_) = rx.recv() => {},
      _ = tokio::time::sleep(Duration::from_secs(3)) => {}
  }
}

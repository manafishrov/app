use crate::models::config::Config;
use futures_util::StreamExt;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::timeout;
use tokio_tungstenite::connect_async;

pub async fn start(mut rx: mpsc::Receiver<Config>) {
  let mut config = crate::commands::config::get_config().unwrap_or_default();

  loop {
    let url = format!("ws://{}:{}", config.ip_address, config.web_socket_port);
    let connect_timeout = Duration::from_secs(5);

    let ws_stream = match timeout(connect_timeout, connect_async(&url)).await {
      Ok(Ok((stream, _))) => stream,
      Ok(Err(e)) => {
        eprintln!("WebSocket connect error: {}. Retrying...", e);
        wait_before_retry(&mut rx).await;
        continue;
      }
      Err(_) => {
        eprintln!("WebSocket connect timeout. Retrying...");
        wait_before_retry(&mut rx).await;
        continue;
      }
    };

    let (_, mut read) = ws_stream.split();

    loop {
      tokio::select! {
          Some(new_config) = rx.recv() => {
              config = new_config;
              eprintln!("Config updated. Reconnecting websocket.");
              break;
          }
          message = read.next() => {
              match message {
                  Some(Ok(msg)) => {
                      if msg.is_text() {
                          let _text = msg.into_text().unwrap();
                      } else if msg.is_close() {
                          eprintln!("Websocket connection closed.");
                          break;
                      }
                  }
                  Some(Err(e)) => {
                      eprintln!("Websocket read error: {}", e);
                      break;
                  }
                  None => {
                      eprintln!("Websocket stream ended.");
                      break;
                  }
              }
          }
      }
    }
  }
}

async fn wait_before_retry(rx: &mut mpsc::Receiver<Config>) {
  tokio::select! {
      Some(_) = rx.recv() => {},
      _ = tokio::time::sleep(Duration::from_secs(3)) => {}
  }
}

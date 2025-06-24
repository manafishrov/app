use futures_util::StreamExt;
use std::time::Duration;
use tokio::time::timeout;
use tokio_tungstenite::connect_async;

pub async fn start_websocket_client() {
  loop {
    let url = "ws://127.0.0.1:9000";

    let connect_timeout = Duration::from_secs(5);

    if let Err(e) = async {
      let (ws_stream, _) = timeout(connect_timeout, connect_async(url)).await??;

      let (_, mut read) = ws_stream.split();

      loop {
        tokio::select! {
            Some(message) = read.next() => {
                match message {
                    Ok(msg) => {
                        if msg.is_text() {
                            let _text = msg.into_text()?;
                        } else if msg.is_close() {
                            break;
                        }
                    }
                    Err(e) => {
                        eprintln!("WebSocket read error: {}", e);
                        break;
                    }
                }
            }
        }
      }
      Ok::<(), Box<dyn std::error::Error>>(())
    }
    .await
    {
      eprintln!("WebSocket error: {}. Retrying in 3 seconds...", e);
    }
    tokio::time::sleep(Duration::from_secs(3)).await;
  }
}

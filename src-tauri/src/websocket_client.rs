use futures_util::{SinkExt, StreamExt};
use tokio::time::Duration;
use tokio_tungstenite::{connect_async, tungstenite::Message};

pub async fn start_websocket_client() {
  loop {
    match connect_and_handle().await {
      Ok(_) => println!("WebSocket connection closed, retrying in 5 seconds..."),
      Err(e) => println!("WebSocket error: {}, retrying in 5 seconds...", e),
    }
    tokio::time::sleep(Duration::from_secs(5)).await;
  }
}

async fn connect_and_handle() -> Result<(), Box<dyn std::error::Error>> {
  let url = "ws://10.10.10.10:5000";
  let (ws_stream, _) = connect_async(url).await?;
  println!("WebSocket connected!");

  let (mut write, mut read) = ws_stream.split();

  write
    .send(Message::Text(String::from("Hello from Tauri!")))
    .await?;
  println!("Sent test message");

  while let Some(message) = read.next().await {
    match message {
      Ok(msg) => {
        if msg.is_text() {
          let text = msg.into_text()?;
          if text == "heartbeat" {
            println!("Received heartbeat from server");
          } else {
            println!("Received message: {}", text);
          }
        }
      }
      Err(e) => {
        println!("Error receiving message: {}", e);
        break;
      }
    }
  }

  Ok(())
}

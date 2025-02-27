use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc::{channel, Receiver};
use tokio::time::Duration;
use tokio_tungstenite::{connect_async, tungstenite::Message};

pub fn create_input_channel() -> (
  tokio::sync::mpsc::Sender<[f32; 6]>,
  tokio::sync::mpsc::Receiver<[f32; 6]>,
) {
  channel(1)
}

pub async fn start_websocket_client(mut input_rx: Receiver<[f32; 6]>) {
  loop {
    match connect_and_handle(&mut input_rx).await {
      Ok(_) => println!("WebSocket connection closed, retrying in 5 seconds..."),
      Err(e) => println!("WebSocket error: {}, retrying in 5 seconds...", e),
    }
    tokio::time::sleep(Duration::from_secs(5)).await;
  }
}

async fn connect_and_handle(
  input_rx: &mut Receiver<[f32; 6]>,
) -> Result<(), Box<dyn std::error::Error>> {
  let url = "ws://10.10.10.10:5000";
  let (ws_stream, _) = connect_async(url).await?;
  println!("WebSocket connected!");

  let (mut write, mut read) = ws_stream.split();

  write
    .send(Message::Text(String::from("Hello from Tauri!").into()))
    .await?;
  println!("Sent test message");

  loop {
    tokio::select! {
        Some(message) = read.next() => {
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
        Some(input) = input_rx.recv() => {
            let input_json = serde_json::to_string(&input)?;
            write.send(Message::Text(input_json.into())).await?;
            println!("Sent input: {:?}", input);
        }
        else => break,
    }
  }

  Ok(())
}

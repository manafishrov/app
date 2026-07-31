use std::time::{Duration, SystemTime, UNIX_EPOCH};

use futures_util::{Sink, SinkExt, StreamExt};
use tauri::{AppHandle, Emitter};
use tokio::sync::{
  mpsc::{self, Receiver},
  oneshot,
};
use tokio::time::{interval, sleep, timeout};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::{self, Message};

use super::handler::handle_message;
use super::message::WebsocketMessage;
use crate::config::get_config_from_file;
use crate::models::config::Config;
use crate::{log_info, log_warn};

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectionStatus {
  is_connected: bool,
  delay: Option<u128>,
}

pub struct MessageSendChannelState {
  pub tx: mpsc::Sender<OutboundMessage>,
}

pub struct OutboundMessage {
  pub message: WebsocketMessage,
  pub sent: Option<oneshot::Sender<Result<(), String>>>,
}

pub struct DirectionVectorSendChannelState {
  pub tx: mpsc::Sender<WebsocketMessage>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum MessageSendOutcome {
  Sent,
  SerializationFailed,
  ConnectionFailed,
}

fn emit_connection_status(app: &AppHandle, is_connected: bool, delay: Option<u128>) {
  if let Err(error) = app.emit(
    "rov_connection_status_updated",
    ConnectionStatus {
      is_connected,
      delay,
    },
  ) {
    log_warn!("Failed to emit connection status: {error}");
  }
}

fn connection_url(config: &Config) -> String {
  format!("ws://{}:{}", config.ip_address, config.web_socket_port)
}

fn config_requires_reconnect(next: &Config, current: &Config) -> bool {
  next.ip_address != current.ip_address || next.web_socket_port != current.web_socket_port
}

fn current_timestamp_ms() -> u128 {
  SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis()
}

async fn send_text_message<S>(
  write: &mut S,
  app: &AppHandle,
  message_text: String,
  error_label: &str,
) -> bool
where
  S: Sink<Message, Error = tungstenite::Error> + Unpin,
{
  if let Err(error) = write.send(Message::Text(message_text.into())).await {
    log_warn!("Websocket send error{}: {}. Reconnecting...", error_label, error);
    emit_connection_status(app, false, None);
    return false;
  }

  true
}

async fn send_serialized_message<S>(
  write: &mut S,
  app: &AppHandle,
  message: &WebsocketMessage,
  serialize_label: &str,
  error_label: &str,
) -> MessageSendOutcome
where
  S: Sink<Message, Error = tungstenite::Error> + Unpin,
{
  let message_text = match serde_json::to_string(message) {
    Ok(text) => text,
    Err(error) => {
      log_warn!("Failed to serialize {}: {}", serialize_label, error);
      return MessageSendOutcome::SerializationFailed;
    },
  };

  if send_text_message(write, app, message_text, error_label).await {
    MessageSendOutcome::Sent
  } else {
    MessageSendOutcome::ConnectionFailed
  }
}

fn complete_outbound_message(
  completion: Option<oneshot::Sender<Result<(), String>>>,
  outcome: MessageSendOutcome,
) -> bool {
  let result = match outcome {
    MessageSendOutcome::Sent => Ok(()),
    MessageSendOutcome::SerializationFailed => {
      Err("Failed to serialize message for the ROV.".to_string())
    },
    MessageSendOutcome::ConnectionFailed => Err("Failed to send message to the ROV.".to_string()),
  };

  if let Some(completion) = completion {
    let _ = completion.send(result);
  }

  outcome == MessageSendOutcome::ConnectionFailed
}

async fn send_ping<S>(write: &mut S, app: &AppHandle) -> bool
where
  S: Sink<Message, Error = tungstenite::Error> + Unpin,
{
  let ping_data = current_timestamp_ms().to_string().into_bytes();

  if let Err(error) = write.send(Message::Ping(ping_data.into())).await {
    log_warn!("Failed to send ping: {}. Reconnecting...", error);
    emit_connection_status(app, false, None);
    return false;
  }

  true
}

async fn handle_incoming_message<S>(
  write: &mut S,
  app: &AppHandle,
  message: Result<Message, tungstenite::Error>,
) -> bool
where
  S: Sink<Message, Error = tungstenite::Error> + Unpin,
{
  match message {
    Ok(message) if message.is_text() || message.is_binary() => {
      if let Some(response) = handle_message(app, message).await
        && let Err(error) = write.send(response).await
      {
        log_warn!("Websocket send error: {}. Reconnecting...", error);
        emit_connection_status(app, false, None);
        return false;
      }
    },
    Ok(message) if message.is_close() => {
      log_warn!("Websocket connection closed by peer. Reconnecting...");
      emit_connection_status(app, false, None);
      return false;
    },
    Ok(message) if message.is_pong() => {
      if let Ok(timestamp_str) = String::from_utf8(message.into_data().to_vec())
        && let Ok(sent_timestamp_ms) = timestamp_str.parse::<u128>()
      {
        let rtt = current_timestamp_ms().saturating_sub(sent_timestamp_ms);
        emit_connection_status(app, true, Some(rtt));
      }
    },
    Ok(_) => {},
    Err(error) => {
      log_warn!("Websocket read error: {}. Reconnecting...", error);
      emit_connection_status(app, false, None);
      return false;
    },
  }

  true
}

pub async fn start_websocket_client(
  app: AppHandle,
  mut config_rx: Receiver<Config>,
  mut message_rx: Receiver<OutboundMessage>,
  mut direction_vector_rx: Receiver<WebsocketMessage>,
) {
  let mut config = get_config_from_file();

  loop {
    let url = connection_url(&config);
    let connect_timeout = Duration::from_secs(5);

    log_info!("Attempting to connect to {}", url);
    let ws_stream = match timeout(connect_timeout, connect_async(&url)).await {
      Ok(Ok((stream, _))) => {
        log_info!("Successfully connected to {}", url);
        stream
      },
      Ok(Err(e)) => {
        log_info!("WebSocket connect error: {}. Retrying...", e);
        emit_connection_status(&app, false, None);
        if let Some(new_config) = wait_before_retry(&mut config_rx).await {
          config = new_config;
        }
        continue;
      },
      Err(_) => {
        log_info!("WebSocket connect timeout. Retrying...");
        emit_connection_status(&app, false, None);
        if let Some(new_config) = wait_before_retry(&mut config_rx).await {
          config = new_config;
        }
        continue;
      },
    };

    let (mut write, mut read) = ws_stream.split();

    let ping_interval_duration = Duration::from_secs(2);
    let mut ping_timer = interval(ping_interval_duration);
    ping_timer.tick().await;

    loop {
      tokio::select! {
          Some(new_config) = config_rx.recv() => {
            if config_requires_reconnect(&new_config, &config) {
              log_info!("WebSocket config updated. Reconnecting websocket.");
              config = new_config;
              emit_connection_status(&app, false, None);
              break;
            }
            config = new_config;
          }
          Some(outbound) = message_rx.recv() => {
              let outcome = send_serialized_message(
                &mut write,
                &app,
                &outbound.message,
                "message",
                "",
              ).await;
              if complete_outbound_message(outbound.sent, outcome) {
                break;
              }
          }
          Some(direction_vector) = direction_vector_rx.recv() => {
              if send_serialized_message(
                &mut write,
                &app,
                &direction_vector,
                "direction vector",
                " (direction vector)",
              ).await == MessageSendOutcome::ConnectionFailed {
                break;
              }
          }
          _ = ping_timer.tick() => {
              if !send_ping(&mut write, &app).await {
                break;
              }
          }
          Some(message) = read.next() => {
              if !handle_incoming_message(&mut write, &app, message).await {
                break;
              }
          }
      }
    }
  }
}

async fn wait_before_retry(rx: &mut Receiver<Config>) -> Option<Config> {
  tokio::select! {
      Some(new_config) = rx.recv() => {
          log_info!("Config updated, retrying immediately.");
          Some(new_config)
      },
      () = sleep(Duration::from_secs(3)) => {
          log_info!("3 seconds passed, retrying connection.");
          None
      }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  /// # Panics
  /// Panics if serialization failure is not returned to the waiting sender.
  #[tokio::test]
  async fn serialization_failure_is_reported_without_reconnecting() {
    let (sent_tx, sent_rx) = oneshot::channel();

    let should_reconnect =
      complete_outbound_message(Some(sent_tx), MessageSendOutcome::SerializationFailed);

    assert!(!should_reconnect);
    assert_eq!(
      sent_rx.await.expect("delivery acknowledgement"),
      Err("Failed to serialize message for the ROV.".to_string())
    );
  }

  /// # Panics
  /// Panics if a connection failure is not returned to the waiting sender.
  #[tokio::test]
  async fn connection_failure_is_reported_and_reconnects() {
    let (sent_tx, sent_rx) = oneshot::channel();

    let should_reconnect =
      complete_outbound_message(Some(sent_tx), MessageSendOutcome::ConnectionFailed);

    assert!(should_reconnect);
    assert_eq!(
      sent_rx.await.expect("delivery acknowledgement"),
      Err("Failed to send message to the ROV.".to_string())
    );
  }
}

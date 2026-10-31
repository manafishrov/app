//! A desktop-only stdio bridge to the bundled ty language server.
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicU64, Ordering};

use serde::Serialize;
use tauri::{AppHandle, State, command, ipc::Channel};
use tokio::io::{AsyncBufReadExt, AsyncRead, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use url::Url;

const MAX_MESSAGE: usize = 8 * 1024 * 1024;

#[derive(Clone, Serialize)]
#[serde(tag = "type", content = "message", rename_all = "camelCase")]
pub enum EditorEvent {
  Message(String),
  Stopped(String),
}

struct Session {
  id: u64,
  child: Child,
  stdin: ChildStdin,
  reader: JoinHandle<()>,
  errors: JoinHandle<()>,
}
impl Drop for Session {
  fn drop(&mut self) {
    self.reader.abort();
    self.errors.abort();
    let _ = self.child.start_kill();
  }
}

#[derive(Default)]
pub struct PythonEditorState {
  session: Mutex<Option<Session>>,
  next_id: AtomicU64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorSession {
  id: u64,
  root_uri: String,
  document_uri: String,
  sdk_status: String,
}

/// # Errors
/// Rejects malformed, oversized, truncated, or non-UTF-8 protocol frames.
async fn read_frame(reader: &mut (impl AsyncRead + Unpin)) -> Result<String, String> {
  let mut header = Vec::new();
  while !header.ends_with(b"\r\n\r\n") {
    if header.len() >= 8192 {
      return Err("Oversized language server header".into());
    }
    header.push(reader.read_u8().await.map_err(|e| e.to_string())?);
  }
  let text = std::str::from_utf8(&header).map_err(|e| e.to_string())?;
  let length = text
    .lines()
    .find_map(|line| {
      let (name, value) = line.split_once(':')?;
      name
        .eq_ignore_ascii_case("Content-Length")
        .then(|| value.trim().parse::<usize>().ok())
        .flatten()
    })
    .ok_or("Missing language server Content-Length")?;
  if length > MAX_MESSAGE {
    return Err("Oversized language server message".into());
  }
  let mut body = vec![0; length];
  reader.read_exact(&mut body).await.map_err(|e| e.to_string())?;
  String::from_utf8(body).map_err(|e| e.to_string())
}

/// # Errors
/// Returns an error when the app executable path cannot be resolved.
fn executable() -> Result<PathBuf, String> {
  let name = if cfg!(windows) {
    "manafish-python-analysis.exe"
  } else {
    "manafish-python-analysis"
  };
  let current = std::env::current_exe().map_err(|e| e.to_string())?;
  Ok(current.parent().ok_or("Missing app executable directory")?.join(name))
}

#[command]
/// # Errors
/// Returns source synchronization, cache, or bundled language-server startup errors.
pub async fn start_python_editor(
  app: AppHandle,
  state: State<'_, PythonEditorState>,
  events: Channel<EditorEvent>,
) -> Result<EditorSession, String> {
  let mut slot = state.session.lock().await;
  // One editor owns one process; a replacement cannot retain the previous document.
  *slot = None;
  let (root, sdk_status) = crate::python_sdk::workspace(&app).await?;
  let root_uri = Url::from_directory_path(&root)
    .map_err(|()| "Invalid Python workspace path")?
    .to_string();
  let document_uri = Url::from_file_path(root.join("custom_action.py"))
    .map_err(|()| "Invalid Python document path")?
    .to_string();
  let mut command = Command::new(executable()?);
  command
    .arg("server")
    .current_dir(&root)
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .kill_on_drop(true);
  #[cfg(windows)]
  command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
  let mut child = command
    .spawn()
    .map_err(|e| format!("Could not start bundled Python analysis: {e}"))?;
  let stdin = child.stdin.take().ok_or("Python analysis has no input pipe")?;
  let stdout = child.stdout.take().ok_or("Python analysis has no output pipe")?;
  let stderr = child.stderr.take().ok_or("Python analysis has no error pipe")?;
  let reader = tokio::spawn(async move {
    let mut reader = BufReader::new(stdout);
    loop {
      match read_frame(&mut reader).await {
        Ok(message) => {
          if events.send(EditorEvent::Message(message)).is_err() {
            break;
          }
        },
        Err(error) => {
          crate::log_warn!("Python analysis stopped: {error}");
          let _ = events.send(EditorEvent::Stopped(error));
          break;
        },
      }
    }
  });
  let errors = tokio::spawn(async move {
    let mut lines = BufReader::new(stderr).lines();
    while let Ok(Some(line)) = lines.next_line().await {
      crate::log_warn!("Python analysis: {line}");
    }
  });
  let id = state.next_id.fetch_add(1, Ordering::Relaxed);
  *slot = Some(Session {
    id,
    child,
    stdin,
    reader,
    errors,
  });
  Ok(EditorSession {
    id,
    root_uri,
    document_uri,
    sdk_status,
  })
}

#[command]
/// # Errors
/// Returns an error for expired sessions, oversized messages, or a stopped language server.
pub async fn send_python_editor(
  state: State<'_, PythonEditorState>,
  id: u64,
  message: String,
) -> Result<(), String> {
  if message.len() > MAX_MESSAGE {
    return Err("Python analysis message is too large".into());
  }
  let mut slot = state.session.lock().await;
  let session = slot.as_mut().filter(|s| s.id == id).ok_or("Python editor session expired")?;
  let header = format!("Content-Length: {}\r\n\r\n", message.len());
  session.stdin.write_all(header.as_bytes()).await.map_err(|e| e.to_string())?;
  session.stdin.write_all(message.as_bytes()).await.map_err(|e| e.to_string())?;
  session.stdin.flush().await.map_err(|e| e.to_string())
}

#[command]
/// # Errors
/// This idempotent cleanup currently always succeeds.
pub async fn stop_python_editor(
  state: State<'_, PythonEditorState>,
  id: u64,
) -> Result<(), String> {
  let mut slot = state.session.lock().await;
  if slot.as_ref().is_some_and(|s| s.id == id) {
    *slot = None;
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  // Assertions and propagated fixture errors are the purpose of these tests.
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]
  use super::*;
  #[tokio::test]
  async fn frames_preserve_unicode_and_reject_unbounded_input() {
    let message = "{\"text\":\"🌊\"}";
    let input = format!("Content-Length: {}\r\n\r\n{message}", message.len());
    assert_eq!(read_frame(&mut input.as_bytes()).await.ok().as_deref(), Some(message));
    assert!(read_frame(&mut b"Content-Length: 999999999\r\n\r\n".as_slice()).await.is_err());
    assert!(read_frame(&mut b"Content-Length: 2\r\n\r\n{".as_slice()).await.is_err());
  }
}

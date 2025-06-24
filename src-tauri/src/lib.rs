mod commands {
  pub mod config;
  pub mod gamepad;
  pub mod movement;
}

mod models {
  pub mod config;
  pub mod gamepad;
  pub mod status;
}

mod gamepad;
mod websocket_client;

use commands::config::{get_config, save_config};
use commands::gamepad::execute_gamepad;
use commands::movement::send_movement_command;
use tauri::{Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;
use tokio::sync::mpsc::Sender;

pub struct ControlChannelState {
  pub tx: Sender<[f32; 6]>,
}

async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
  if let Some(update) = app.updater()?.check().await? {
    app.emit("update-available", ()).unwrap();
    let mut downloaded = 0;
    update
      .download_and_install(
        |chunk_length, content_length| {
          downloaded += chunk_length;
          app
            .emit(
              "update-progress",
              serde_json::json!({
                "downloaded": downloaded,
                "total": content_length.unwrap_or(0)
              }),
            )
            .unwrap();
        },
        || {
          app.emit("update-downloaded", ()).unwrap();
        },
      )
      .await?;
    app.emit("update-ready", ()).unwrap();
  }

  Ok(())
}

fn setup_handlers(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
  let (control_tx, control_rx) = websocket_client::create_control_channel();
  let app_handle = app.app_handle().clone();
  let update_handle = app.app_handle().clone();

  app.manage(ControlChannelState { tx: control_tx });
  tauri::async_runtime::spawn(async move {
    websocket_client::start_websocket_client(control_rx, app_handle).await;
  });
  tauri::async_runtime::spawn(async move {
    update(update_handle).await.unwrap();
  });

  Ok(())
}

pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      get_config,
      save_config,
      send_movement_command,
      execute_gamepad,
    ])
    .setup(setup_handlers);

  builder
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, _event| {});
}

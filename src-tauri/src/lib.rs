mod commands {
  pub mod config;
  pub mod control;
  pub mod status;
}

mod models {
  pub mod config;
}

mod websocket_client;

use commands::config::{get_config, save_config};
use commands::control::send_control_input;
use commands::status::{get_connection_status, get_water_sensor_status};
use tauri::Manager;
use tokio::sync::mpsc::Sender;

pub struct ControlChannelState {
  pub tx: Sender<[f32; 6]>,
}

fn setup_handlers(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
  let (control_tx, control_rx) = websocket_client::create_control_channel();

  app.manage(ControlChannelState { tx: control_tx });

  tauri::async_runtime::spawn(async move {
    websocket_client::start_websocket_client(control_rx).await;
  });

  Ok(())
}

pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      get_config,
      save_config,
      get_connection_status,
      get_water_sensor_status,
      send_control_input
    ])
    .setup(setup_handlers);

  builder
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, _event| {});
}

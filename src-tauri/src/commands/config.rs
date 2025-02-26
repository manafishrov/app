use crate::models::config::{
  Config, ControllerBindings, ControllerButtons, KeyboardBindings, StickAxis,
};
use std::fs;
use std::path::PathBuf;

fn get_config_path() -> PathBuf {
  let base_dir = dirs::config_dir().expect("Failed to get config directory");
  base_dir.join("cyberfish").join("config.json")
}

#[tauri::command]
pub fn get_config() -> Result<Config, String> {
  let config_path = get_config_path();

  if let Ok(content) = fs::read_to_string(config_path) {
    serde_json::from_str(&content).map_err(|e| e.to_string())
  } else {
    Ok(Config {
      ip: "10.10.10.10".to_string(),
      stream_port: 8889,
      control_port: 5000,
      keyboard: KeyboardBindings {
        move_forward: "w".to_string(),
        move_backward: "s".to_string(),
        move_left: "a".to_string(),
        move_right: "d".to_string(),
        move_up: "space".to_string(),
        move_down: "shift".to_string(),
        rotate_left: "q".to_string(),
        rotate_right: "e".to_string(),
        tilt_up: "i".to_string(),
        tilt_down: "k".to_string(),
        tilt_diagonal_left: "j".to_string(),
        tilt_diagonal_right: "l".to_string(),
      },
      controller: ControllerBindings {
        left_stick: StickAxis {
          x_axis: 0,
          y_axis: 1,
        },
        right_stick: StickAxis {
          x_axis: 2,
          y_axis: 3,
        },
        buttons: ControllerButtons {
          move_up: 4,
          move_down: 6,
          rotate_left: 14,
          rotate_right: 15,
        },
      },
    })
  }
}

#[tauri::command]
pub fn save_config(config: Config) -> Result<(), String> {
  let config_path = get_config_path();

  if let Some(parent) = config_path.parent() {
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }

  let content = serde_json::to_string(&config).map_err(|e| e.to_string())?;
  fs::write(config_path, content).map_err(|e| e.to_string())?;

  Ok(())
}

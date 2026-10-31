pub mod app;
#[cfg(desktop)]
pub mod app_update;
pub mod control;
#[cfg(desktop)]
pub mod firmware;
pub mod gamepad;
pub mod recording;
pub mod rov;

pub use app::{
  close_splashscreen, get_config, initialize_log_listener, open_text_file, save_text_file,
  set_config, stage_config,
};
#[cfg(desktop)]
pub use app_update::{fetch_app_releases, install_app_release};
pub use control::{deactivate_direction_vector, send_direction_vector};
#[cfg(desktop)]
pub use firmware::{
  cancel_flash, cleanup_firmware_cache, download_firmware_update, fetch_firmware_manifest,
  list_firmware_releases, list_flash_drives, prepare_flash, signal_flash_image,
};
pub use gamepad::{gamepad_vibrate, start_gamepad_stream};
pub use recording::{append_recording_chunk, save_recording};
#[cfg(mobile)]
pub use recording::{describe_video_directory, pick_video_directory};
pub use rov::{
  cancel_regulator_auto_tuning, cancel_thruster_test, confirm_rov_config, flash_esc_firmware,
  flash_mcu_firmware, import_rov_config, request_rov_config, set_rov_config,
  start_regulator_auto_tuning, start_thruster_test,
};

pub mod capabilities;
pub use capabilities::{import_custom_action_source, request_capability, save_csv};

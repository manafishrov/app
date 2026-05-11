pub mod app;
pub mod control;
pub mod firmware;
pub mod gamepad;
pub mod recording;
pub mod rov;

pub use app::{close_splashscreen, get_config, set_config};
pub use control::{
  send_custom_action, send_direction_vector, set_desired_depth, toggle_auto_stabilization,
  toggle_depth_hold,
};
pub use firmware::{
  cancel_flash, cleanup_firmware_cache, download_firmware_update, fetch_firmware_manifest,
  list_firmware_releases, list_flash_drives, prepare_flash, signal_flash_image,
};
pub use gamepad::{gamepad_vibrate, start_gamepad_stream};
pub use recording::{append_recording_chunk, save_recording};
pub use rov::{
  cancel_regulator_auto_tuning, cancel_thruster_test, flash_mcu_firmware, import_rov_config,
  request_rov_config, set_rov_config, start_regulator_auto_tuning, start_thruster_test,
};

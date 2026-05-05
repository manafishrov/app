pub mod app;
pub mod control;
pub mod gamepad;
pub mod recording;
pub mod rov;
pub mod update;

pub use app::{close_splashscreen, get_config, set_config};
pub use control::{
  send_custom_action, send_direction_vector, set_desired_depth, toggle_auto_stabilization,
  toggle_depth_hold,
};
pub use gamepad::{gamepad_vibrate, start_gamepad_stream};
pub use recording::{append_recording_chunk, save_recording};
pub use rov::{
  cancel_regulator_auto_tuning, cancel_thruster_test, flash_mcu_firmware, request_rov_config,
  set_rov_config, start_regulator_auto_tuning, start_thruster_test,
};
pub use update::{
  check_firmware_update, download_firmware_update, manual_rollback_firmware, upload_firmware_update,
};

use crate::models::thrusters::{ThrusterAllocation, ThrusterPinSetup};
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_thruster_pin_setup(
  app_handle: &AppHandle,
  payload: &ThrusterPinSetup,
) -> Option<Message> {
  app_handle.emit("thruster_pin_setup", payload).unwrap();
  None
}

pub fn handle_thruster_allocation(
  app_handle: &AppHandle,
  payload: &ThrusterAllocation,
) -> Option<Message> {
  app_handle.emit("thruster_allocation", payload).unwrap();
  None
}

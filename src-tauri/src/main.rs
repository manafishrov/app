// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpStream;
use std::time::Duration;

const ROV_ADDRESS: &str = "rasberrypi.local:5009";
const VIDEO_STREAM_URL: &str = "http://rasberrypi.local:5009/video_feed";

#[tauri::command]
fn get_video_stream() -> Result<String, String> {
  match TcpStream::connect_timeout(&ROV_ADDRESS.parse().unwrap(), Duration::from_secs(1)) {
    Ok(_) => Ok(VIDEO_STREAM_URL.to_string()),
    Err(_) => Err("Cannot connect to ROV".to_string()),
  }
}

#[tauri::command]
async fn check_connection() -> bool {
  match TcpStream::connect_timeout(&ROV_ADDRESS.parse().unwrap(), Duration::from_secs(1)) {
    Ok(_) => true,
    Err(_) => false,
  }
}

fn main() {
  cyberfish_lib::run()
}

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpStream;
use std::time::Duration;

const ROV_IP: &str = "192.168.1.139";
const ROV_PORT: &str = "5009";
const ROV_ADDRESS: &str = const_str::concat!(ROV_IP, ":", ROV_PORT);
const VIDEO_STREAM_URL: &str = const_str::concat!("http://", ROV_IP, ":", ROV_PORT, "/video_feed");

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

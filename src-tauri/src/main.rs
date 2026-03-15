// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  if let Err(error) = manafish_lib::run() {
    eprintln!("Failed to start app: {error}");
    std::process::exit(1);
  }
}

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
fn add_ffmpeg_resources_to_path() {
  use std::{env, path::PathBuf};

  if let Ok(exe_path) = env::current_exe() {
    if let Some(exe_dir) = exe_path.parent() {
      let resources_dir: PathBuf = exe_dir.join("resources");
      if resources_dir.is_dir() {
        let mut new_path = resources_dir.into_os_string();
        if let Some(old_path) = env::var_os("PATH") {
          new_path.push(";");
          new_path.push(old_path);
        }
        env::set_var("PATH", new_path);
      }
    }
  }
}

fn main() {
  #[cfg(target_os = "windows")]
  add_ffmpeg_resources_to_path();

  manafish_lib::run()
}

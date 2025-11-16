// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
fn add_ffmpeg_resources_to_dll_search_path() {
  use std::{env, ffi::OsStr, os::windows::ffi::OsStrExt, path::PathBuf};
  use windows_sys::Win32::System::LibraryLoader::{
    AddDllDirectory, SetDefaultDllDirectories, LOAD_LIBRARY_SEARCH_DEFAULT_DIRS,
  };

  if let Ok(exe_path) = env::current_exe() {
    if let Some(exe_dir) = exe_path.parent() {
      let resources_dir: PathBuf = exe_dir.join("resources");

      if resources_dir.is_dir() {
        if let Some(path_str) = resources_dir.to_str() {
          let wide: Vec<u16> = OsStr::new(path_str)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

          unsafe {
            SetDefaultDllDirectories(LOAD_LIBRARY_SEARCH_DEFAULT_DIRS);
            AddDllDirectory(wide.as_ptr());
          }
        }
      }
    }
  }
}

fn main() {
  #[cfg(target_os = "windows")]
  add_ffmpeg_resources_to_dll_search_path();

  manafish_lib::run()
}

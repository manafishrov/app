fn main() {
  #[cfg(target_os = "macos")]
  println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path");

  #[cfg(target_os = "linux")]
  println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN");

  std::env::set_var("FFMPEG_CONFIGURE_FLAGS", "--disable-avfoundation");

  tauri_build::build()
}

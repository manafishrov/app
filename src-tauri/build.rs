fn main() {
  #[cfg(target_os = "macos")]
  println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path/../Frameworks");

  // Bundled libraries (FFmpeg etc.) are installed in a `Manafish/` directory
  // next to the binary (e.g. /usr/bin/Manafish), so search there at runtime.
  #[cfg(target_os = "linux")]
  println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN/Manafish");

  tauri_build::build();
}

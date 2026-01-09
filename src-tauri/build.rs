fn main() {
  if cfg!(target_os = "macos") {
    println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path");
  }
  if cfg!(target_os = "linux") {
    println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN");
  }
  tauri_build::build()
}

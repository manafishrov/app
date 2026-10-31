fn main() {
  // The app calls the native plugin from Rust only, so no frontend commands
  // are exposed.
  tauri_plugin::Builder::new(&[]).android_path("android").ios_path("ios").build();
}

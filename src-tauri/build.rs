fn main() {
  #[cfg(target_os = "macos")]
  println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path/../Frameworks");

  // Tauri installs the binary at /usr/bin/manafish and bundled resources
  // (FFmpeg etc.) at /usr/lib/Manafish/ (deb/rpm use product_name verbatim for
  // the resource dir). From the binary that is $ORIGIN/../lib/Manafish.
  #[cfg(target_os = "linux")]
  println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN/../lib/Manafish");

  tauri_build::build();
}

fn main() {
  #[cfg(target_os = "macos")]
  println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path/../Frameworks");

  // Tauri installs the binary at /usr/bin/manafish and bundled resources
  // (FFmpeg etc.) at /usr/lib/Manafish/ (deb/rpm use product_name verbatim for
  // the resource dir). From the binary that is $ORIGIN/../lib/Manafish.
  // The WebRTC-enabled WebKitGTK runtime ships under webkit/lib in the same
  // resource dir; it must win over the host webkit, so it is on the rpath too.
  #[cfg(target_os = "linux")]
  println!(
    "cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN/../lib/Manafish/webkit/lib:$ORIGIN/../lib/Manafish"
  );

  tauri_build::build();
}

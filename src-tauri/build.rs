use std::process::Command;

fn command_stdout(args: &[&str]) -> Option<String> {
  let output = Command::new("git").args(args).output().ok()?;
  if !output.status.success() {
    return None;
  }
  let value = String::from_utf8(output.stdout).ok()?;
  let value = value.trim();
  (!value.is_empty()).then(|| value.to_string())
}

fn watch_git_head() {
  let Some(head_path) = command_stdout(&["rev-parse", "--git-path", "HEAD"]) else {
    return;
  };
  println!("cargo:rerun-if-changed={head_path}");

  let Some(head_ref) = command_stdout(&["symbolic-ref", "HEAD"]) else {
    return;
  };
  if let Some(ref_path) = command_stdout(&["rev-parse", "--git-path", &head_ref]) {
    println!("cargo:rerun-if-changed={ref_path}");
  }
}

fn expose_development_version() {
  if std::env::var("PROFILE").as_deref() != Ok("debug") {
    return;
  }

  let Some(description) = command_stdout(&[
    "describe", "--tags", "--match", "v[0-9]*", "--long", "--dirty",
  ]) else {
    return;
  };
  println!("cargo:rustc-env=MANAFISH_GIT_DESCRIBE={description}");
}

fn main() {
  watch_git_head();
  expose_development_version();

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

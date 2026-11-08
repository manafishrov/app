//! Private vendor-managed compilation caches. A full model hash is required:
//! vendor graph keys alone may omit weight changes. Cache failure is optional.
use std::fmt::Write as _;
use std::fs;
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use sha2::{Digest, Sha256};

use super::model::ExecutionProvider;

static ROOT: OnceLock<PathBuf> = OnceLock::new();
static MUTATIONS: Mutex<()> = Mutex::new(());
const MAX_ENTRIES: usize = 8;
const MAX_BYTES: u64 = 1024 * 1024 * 1024;

pub fn init(app: &tauri::AppHandle) {
  use tauri::Manager;
  if let Ok(path) = app.path().app_cache_dir() {
    let _ = ROOT.set(path.join("detection-compiled-v1"));
  }
}

/// # Errors
/// Returns file read errors.
fn digest_file(path: &Path, hash: &mut Sha256) -> io::Result<()> {
  let mut file = fs::File::open(path)?;
  let mut buffer = [0; 8192];
  loop {
    let count = file.read(&mut buffer)?;
    if count == 0 {
      return Ok(());
    }
    hash.update(&buffer[..count]);
  }
}

fn hex(hash: Sha256) -> String {
  let mut value = String::with_capacity(64);
  for byte in hash.finalize() {
    let _ = write!(&mut value, "{byte:02x}");
  }
  value
}

/// # Errors
/// Returns model file read errors.
fn key(path: &Path, identity: &str) -> io::Result<String> {
  let mut hash = Sha256::new();
  hash.update(b"manafish-compiled-v1\0ort-2.0.0-rc.15\0");
  hash.update(identity.as_bytes());
  hash.update([0]);
  digest_file(path, &mut hash)?;
  Ok(hex(hash))
}

/// # Errors
/// Rejects linked/shared directories and returns filesystem errors.
fn private_directory(path: &Path) -> io::Result<()> {
  match fs::symlink_metadata(path) {
    Ok(meta) if !meta.is_dir() || meta.file_type().is_symlink() => {
      return Err(io::Error::other("Unsafe compilation cache path"));
    },
    Ok(_) => {
      #[cfg(unix)]
      {
        use std::os::unix::fs::PermissionsExt;
        if fs::metadata(path)?.permissions().mode() & 0o077 != 0 {
          return Err(io::Error::other("Shared compilation cache directory"));
        }
      }
    },
    Err(error) if error.kind() == io::ErrorKind::NotFound => {
      let mut builder = fs::DirBuilder::new();
      builder.recursive(true);
      #[cfg(unix)]
      {
        use std::os::unix::fs::DirBuilderExt;
        builder.mode(0o700);
      }
      builder.create(path)?;
    },
    Err(error) => return Err(error),
  }
  #[cfg(unix)]
  {
    use std::os::unix::fs::{MetadataExt, PermissionsExt};
    // Reject shared directories instead of trusting compiled code from them.
    let metadata = fs::metadata(path)?;
    if metadata.mode() & 0o077 != 0 {
      fs::set_permissions(path, fs::Permissions::from_mode(0o700))?;
    }
  }
  Ok(())
}

/// # Errors
/// Rejects linked/deep entries and returns filesystem errors.
fn size(path: &Path, depth: usize) -> io::Result<u64> {
  let metadata = fs::symlink_metadata(path)?;
  if metadata.file_type().is_symlink() || depth > 16 {
    return Err(io::Error::other("Unsafe compilation cache entry"));
  }
  if metadata.is_file() {
    return Ok(metadata.len());
  }
  let mut total = 0_u64;
  for entry in fs::read_dir(path)? {
    total = total.saturating_add(size(&entry?.path(), depth + 1)?);
    if total > MAX_BYTES {
      break;
    }
  }
  Ok(total)
}

/// Retained for the life of a session so pruning cannot remove an active entry.
/// The app runs one inference session; imports use CPU validation.
pub struct CacheEntry {
  path: PathBuf,
}

impl CacheEntry {
  pub fn path(&self) -> &Path {
    &self.path
  }
  pub fn invalidate(&self) {
    let _ = fs::remove_dir_all(&self.path);
  }

  fn finish(&self) {
    // Vendor writes are not quota-controlled mid-compilation. Enforce the
    // bound after the owning session has released its compiled files.
    if self
      .path
      .parent()
      .is_some_and(|root| size(root, 0).is_ok_and(|bytes| bytes > MAX_BYTES))
    {
      self.invalidate();
    }
  }
}

/// Returns None when identity/storage is unavailable. The caller then builds
/// a normal uncached session on the same provider.
pub fn prepare(path: &Path, provider: ExecutionProvider) -> Option<CacheEntry> {
  let identity = identity(provider)?;
  let root = ROOT.get()?;
  let _lock = MUTATIONS.lock().ok()?;
  prepare_in(root, path, &identity).ok()
}

/// # Errors
/// Returns invalid identity/storage and integrity errors.
fn prepare_in(root: &Path, model: &Path, identity: &str) -> io::Result<CacheEntry> {
  private_directory(root)?;
  let path = root.join(key(model, identity)?);
  let entries = fs::read_dir(root)?.collect::<Result<Vec<_>, _>>()?;
  // A fixed admission bound avoids evicting compiled models still used by
  // native sessions. The OS or user may clear this disposable cache at any time.
  if size(root, 0)? >= MAX_BYTES || (!path.exists() && entries.len() >= MAX_ENTRIES) {
    return Err(io::Error::other("Compilation cache is full"));
  }
  private_directory(&path)?;
  // Verify disposable bytes before allowing a vendor deserializer to read them.
  let manifest_path = path.join("integrity.json");
  if manifest_path.exists() && fs::metadata(&manifest_path)?.len() > 2 * 1024 * 1024 {
    fs::remove_dir_all(&path)?;
    private_directory(&path)?;
  }
  if manifest_path.exists() {
    let expected = serde_json::from_slice::<std::collections::BTreeMap<String, String>>(&fs::read(
      &manifest_path,
    )?)
    .ok();
    if expected.as_ref() != Some(&manifest(&path)?) {
      fs::remove_dir_all(&path)?;
      private_directory(&path)?;
    }
  } else if fs::read_dir(&path)?.next().is_some() {
    // Interrupted compilation has no trusted complete manifest.
    fs::remove_dir_all(&path)?;
    private_directory(&path)?;
  }
  Ok(CacheEntry { path })
}

/// # Errors
/// Returns unsafe paths, oversized manifests and read errors.
fn manifest(root: &Path) -> io::Result<std::collections::BTreeMap<String, String>> {
  /// # Errors
  /// Rejects linked/deep paths and returns read errors.
  fn visit(
    root: &Path,
    path: &Path,
    result: &mut std::collections::BTreeMap<String, String>,
    depth: usize,
  ) -> io::Result<()> {
    if depth > 16 {
      return Err(io::Error::other("Deep compilation cache"));
    }
    for entry in fs::read_dir(path)? {
      if result.len() >= 8192 {
        return Err(io::Error::other("Too many compilation cache files"));
      }
      let entry = entry?;
      let path = entry.path();
      let metadata = fs::symlink_metadata(&path)?;
      if metadata.file_type().is_symlink() {
        return Err(io::Error::other("Linked compilation cache"));
      }
      if metadata.is_dir() {
        visit(root, &path, result, depth + 1)?;
      } else if path != root.join("integrity.json") {
        let mut hash = Sha256::new();
        digest_file(&path, &mut hash)?;
        result.insert(
          path
            .strip_prefix(root)
            .map_err(io::Error::other)?
            .to_string_lossy()
            .into_owned(),
          hex(hash),
        );
      }
    }
    Ok(())
  }
  let mut result = std::collections::BTreeMap::new();
  visit(root, root, &mut result, 0)?;
  Ok(result)
}

impl Drop for CacheEntry {
  fn drop(&mut self) {
    let _lock = MUTATIONS.lock().ok();
    self.finish();
    if !self.path.exists() {
      return;
    }
    if let Ok(values) = manifest(&self.path)
      && let Ok(bytes) = serde_json::to_vec(&values)
    {
      let _ = fs::write(self.path.join("integrity.json"), bytes);
    }
  }
}

fn identity(provider: ExecutionProvider) -> Option<String> {
  match provider {
    #[cfg(any(target_os = "macos", target_os = "ios"))]
    ExecutionProvider::CoreMl => {
      // Core ML is supplied by the OS. Kernel build + hardware model separate
      // OS upgrades and devices (including caches restored to other hardware).
      fn sysctl(name: &std::ffi::CStr) -> Option<String> {
        let mut buffer = [0_u8; 1024];
        let mut length = buffer.len();
        // SAFETY: both output pointers refer to live, correctly sized buffers;
        // sysctl writes at most `length` bytes and no new value is supplied.
        let result = unsafe {
          libc::sysctlbyname(
            name.as_ptr(),
            buffer.as_mut_ptr().cast(),
            &mut length,
            std::ptr::null_mut(),
            0,
          )
        };
        (result == 0 && length <= buffer.len())
          .then(|| String::from_utf8_lossy(&buffer[..length]).into_owned())
      }
      Some(format!(
        "{}|{}|{}|CoreML|{}|{}|{}|{}|L3|f32|all-compute-units",
        ort::info(),
        std::env::consts::OS,
        std::env::consts::ARCH,
        sysctl(c"hw.machine")?,
        sysctl(c"hw.model")?,
        sysctl(c"kern.osversion")?,
        if cfg!(target_os = "ios") {
          "MLProgram"
        } else {
          "NeuralNetwork"
        }
      ))
    },
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    ExecutionProvider::OpenVino => {
      // OpenVINO's GPU blob includes its own driver/device/compile-properties
      // compatibility check. Also namespace by kernel, PCI IDs and loaded vendor
      // libraries; content hashes catch vendor upgrades at the same pathname.
      let mut hash = Sha256::new();
      hash.update(ort::info().as_bytes());
      hash.update(fs::read("/proc/sys/kernel/osrelease").ok()?);
      for device in fs::read_dir("/sys/class/drm").ok()?.flatten() {
        let path = device.path().join("device");
        if fs::read_to_string(path.join("vendor")).is_ok_and(|v| v.trim() == "0x8086") {
          hash.update(fs::read(path.join("device")).ok()?);
          hash.update(fs::read(path.join("revision")).ok()?);
        }
      }
      let maps = fs::read_to_string("/proc/self/maps").ok()?;
      let libraries: std::collections::BTreeSet<_> = maps
        .lines()
        .filter_map(|line| line.split_whitespace().last())
        .filter(|path| {
          path.starts_with('/')
            && (path.contains("libopenvino")
              || path.contains("libigdrcl")
              || path.contains("libonnxruntime"))
        })
        .collect();
      if !libraries.iter().any(|path| path.contains("libopenvino")) {
        return None;
      }
      for library in libraries {
        digest_file(Path::new(library), &mut hash).ok()?;
      }
      Some(format!("OpenVINO|GPU|f32|L3|{}", hex(hash)))
    },
    _ => None,
  }
}

#[cfg(test)]
mod tests {
  #![allow(
    clippy::unwrap_used,
    clippy::missing_panics_doc,
    clippy::missing_errors_doc
  )]
  use super::*;

  #[test]
  fn full_model_bytes_and_provider_options_invalidate_cache() {
    let directory = tempfile::tempdir().unwrap();
    let model = directory.path().join("model.onnx");
    fs::write(&model, b"same graph, weights A").unwrap();
    let first = key(&model, "ort1.31/CoreML/OS1/device1/f32").unwrap();
    fs::write(&model, b"same graph, weights B").unwrap();
    assert_ne!(first, key(&model, "ort1.31/CoreML/OS1/device1/f32").unwrap());
    for identity in [
      "ort1.32/CoreML/OS1/device1/f32",
      "ort1.31/CoreML/OS2/device1/f32",
      "ort1.31/CoreML/OS1/device2/f32",
      "ort1.31/CoreML/OS1/device1/f16",
    ] {
      assert_ne!(
        key(&model, identity).unwrap(),
        key(&model, "ort1.31/CoreML/OS1/device1/f32").unwrap()
      );
    }
  }

  #[test]
  fn corruption_and_interrupted_writes_are_rebuilt_and_entries_are_bounded() {
    let directory = tempfile::tempdir().unwrap();
    let root = directory.path().join("cache");
    let model = directory.path().join("model.onnx");
    fs::write(&model, b"model").unwrap();
    let entry = prepare_in(&root, &model, "first").unwrap();
    let compiled = entry.path().join("model.bin");
    fs::write(&compiled, b"compiled").unwrap();
    drop(entry);
    assert!(prepare_in(&root, &model, "first").unwrap().path().join("model.bin").exists());
    fs::write(&compiled, b"corrupt").unwrap();
    let entry = prepare_in(&root, &model, "first").unwrap();
    assert!(!compiled.exists());
    drop(entry);
    fs::remove_file(compiled.parent().unwrap().join("integrity.json")).unwrap();
    fs::write(&compiled, b"partial").unwrap();
    assert!(!prepare_in(&root, &model, "first").unwrap().path().join("model.bin").exists());
    for index in 1..MAX_ENTRIES {
      drop(prepare_in(&root, &model, &index.to_string()).unwrap());
    }
    assert!(prepare_in(&root, &model, "full").is_err());
  }

  #[cfg(unix)]
  #[test]
  fn refuses_symlinked_cache_paths() {
    let directory = tempfile::tempdir().unwrap();
    let root = directory.path().join("linked");
    std::os::unix::fs::symlink(directory.path(), &root).unwrap();
    assert!(private_directory(&root).is_err());
  }
}

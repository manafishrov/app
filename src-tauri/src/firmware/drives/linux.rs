use std::process::Command;

use serde::{Deserialize, Deserializer};

use super::{FlashDrive, FlashDriveMountpoint};

/// Deserialize a flag that lsblk may emit as a JSON boolean (newer
/// util-linux) or as an integer 0/1 (older util-linux).
///
/// # Errors
/// Returns an error if the underlying value cannot be deserialized.
fn deserialize_flag<'de, D>(deserializer: D) -> Result<Option<bool>, D::Error>
where
  D: Deserializer<'de>,
{
  let value = Option::<serde_json::Value>::deserialize(deserializer)?;
  Ok(value.map(|v| match v {
    serde_json::Value::Bool(b) => b,
    serde_json::Value::Number(n) => n.as_u64().unwrap_or(0) == 1,
    serde_json::Value::String(s) => s == "1" || s.eq_ignore_ascii_case("true"),
    _ => false,
  }))
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct LsblkRoot {
  blockdevices: Vec<LsblkDevice>,
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct LsblkDevice {
  name: Option<String>,
  #[serde(rename = "type")]
  kind: Option<String>,
  size: Option<serde_json::Value>,
  #[serde(default, deserialize_with = "deserialize_flag")]
  ro: Option<bool>,
  #[serde(default, deserialize_with = "deserialize_flag")]
  rm: Option<bool>,
  #[serde(default, deserialize_with = "deserialize_flag")]
  hotplug: Option<bool>,
  tran: Option<String>,
  subsystems: Option<String>,
  model: Option<String>,
  vendor: Option<String>,
  mountpoint: Option<String>,
  mountpoints: Option<Vec<Option<String>>>,
  label: Option<String>,
  partlabel: Option<String>,
  #[serde(rename = "phy-sec")]
  phy_sec: Option<u32>,
  children: Option<Vec<LsblkDevice>>,
}

fn parse_size(value: &serde_json::Value) -> u64 {
  if let Some(n) = value.as_u64() {
    return n;
  }
  if let Some(s) = value.as_str() {
    return s.parse::<u64>().unwrap_or(0);
  }
  0
}

fn flag(value: Option<bool>) -> bool {
  value.unwrap_or(false)
}

fn make_description(device: &LsblkDevice) -> String {
  let vendor = device.vendor.as_deref().unwrap_or("").trim().to_string();
  let model = device.model.as_deref().unwrap_or("").trim().to_string();
  match (vendor.is_empty(), model.is_empty()) {
    (true, true) => device.name.clone().unwrap_or_default(),
    (true, false) => model,
    (false, true) => vendor,
    (false, false) => format!("{vendor} {model}"),
  }
}

fn collect_mountpoints(device: &LsblkDevice) -> Vec<FlashDriveMountpoint> {
  let mut mounts = Vec::new();
  if let Some(children) = &device.children {
    for child in children {
      if let Some(ref single) = child.mountpoint
        && !single.is_empty()
        && single != "[SWAP]"
      {
        mounts.push(FlashDriveMountpoint {
          path: single.clone(),
          label: child.label.clone().or_else(|| child.partlabel.clone()),
        });
      }
      if let Some(ref many) = child.mountpoints {
        for entry in many.iter().flatten() {
          if !entry.is_empty() && entry != "[SWAP]" {
            mounts.push(FlashDriveMountpoint {
              path: entry.clone(),
              label: child.label.clone().or_else(|| child.partlabel.clone()),
            });
          }
        }
      }
    }
  }
  mounts
}

fn build_drive(device: &LsblkDevice) -> Option<FlashDrive> {
  let kind = device.kind.as_deref().unwrap_or("");
  if kind != "disk" {
    return None;
  }
  let name = device.name.as_deref().unwrap_or("");
  if name.is_empty()
    || name.starts_with("/dev/loop")
    || name.starts_with("/dev/sr")
    || name.starts_with("/dev/ram")
  {
    return None;
  }

  // Drop pseudo block devices (zram, device-mapper, md, etc.) that report a
  // "block" subsystem rather than a real transport; they are never flash
  // targets.
  let subsystems = device.subsystems.as_deref().unwrap_or("");
  if subsystems.eq_ignore_ascii_case("block")
    || name.starts_with("/dev/zram")
    || name.starts_with("/dev/dm-")
    || name.starts_with("/dev/md")
  {
    return None;
  }

  let tran = device.tran.as_deref().unwrap_or("").to_ascii_lowercase();
  let is_usb = tran == "usb";
  // Internal SD/MMC readers report tran "mmc"/"sd" and may not set the
  // removable flag, so treat them as removable cards explicitly.
  let is_mmc = tran == "mmc" || tran == "sd" || name.starts_with("/dev/mmcblk");
  let is_card = is_mmc;
  let is_removable = flag(device.rm) || flag(device.hotplug) || is_mmc;
  let is_system = !is_removable && !is_usb;

  let device_path = name.to_string();
  let size = device.size.as_ref().map_or(0, parse_size);
  let block_size = device.phy_sec.unwrap_or(0);

  Some(FlashDrive {
    device: device_path.clone(),
    raw_device: device_path,
    description: make_description(device),
    size,
    block_size,
    is_read_only: flag(device.ro),
    is_removable,
    is_usb,
    is_card,
    is_system,
    mountpoints: collect_mountpoints(device),
  })
}

/// # Errors
/// Returns an error if `lsblk` cannot be run or its JSON output cannot be parsed.
pub fn list_drives() -> Result<Vec<FlashDrive>, String> {
  let output = Command::new("lsblk")
    .args(["--bytes", "--all", "--json", "--paths", "--output-all"])
    .output()
    .map_err(|e| format!("Failed to run lsblk: {e}"))?;
  if !output.status.success() {
    return Err(format!("lsblk failed: {}", String::from_utf8_lossy(&output.stderr)));
  }
  let parsed: LsblkRoot = serde_json::from_slice(&output.stdout)
    .map_err(|e| format!("Failed to parse lsblk JSON: {e}"))?;
  Ok(parsed.blockdevices.iter().filter_map(build_drive).collect())
}

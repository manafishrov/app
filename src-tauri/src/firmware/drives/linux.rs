use std::process::Command;

use serde::Deserialize;

use super::{FlashDrive, FlashDriveMountpoint};

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
  ro: Option<u8>,
  rm: Option<u8>,
  hotplug: Option<u8>,
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

fn flag(value: Option<u8>) -> bool {
  value.unwrap_or(0) == 1
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
      if let Some(ref single) = child.mountpoint {
        if !single.is_empty() && single != "[SWAP]" {
          mounts.push(FlashDriveMountpoint {
            path: single.clone(),
            label: child.label.clone().or_else(|| child.partlabel.clone()),
          });
        }
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

  let tran = device.tran.as_deref().unwrap_or("").to_ascii_lowercase();
  let subsystems = device.subsystems.as_deref().unwrap_or("");
  let is_virtual = subsystems.eq_ignore_ascii_case("block");
  let is_usb = tran == "usb";
  let is_removable = flag(device.rm) || flag(device.hotplug) || is_virtual;
  let is_system = !is_removable && !is_virtual;

  let device_path = name.to_string();
  let size = device.size.as_ref().map(parse_size).unwrap_or(0);
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
    is_card: false,
    is_system,
    mountpoints: collect_mountpoints(device),
  })
}

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

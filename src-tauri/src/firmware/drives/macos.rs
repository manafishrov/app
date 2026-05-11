use std::process::Command;

use plist::Value;

use super::{FlashDrive, FlashDriveMountpoint};

/// # Errors
///
/// Returns an error if `diskutil` cannot be executed, exits unsuccessfully, or
/// its plist output cannot be parsed.
fn run_plist(args: &[&str]) -> Result<Value, String> {
  let output = Command::new("/usr/sbin/diskutil")
    .args(args)
    .output()
    .map_err(|e| format!("Failed to run diskutil {}: {e}", args.join(" ")))?;
  if !output.status.success() {
    return Err(format!(
      "diskutil {} failed: {}",
      args.join(" "),
      String::from_utf8_lossy(&output.stderr)
    ));
  }
  plist::from_bytes::<Value>(&output.stdout).map_err(|e| e.to_string())
}

fn as_dict(value: &Value) -> Option<&plist::Dictionary> {
  value.as_dictionary()
}

fn dict_string(dict: &plist::Dictionary, key: &str) -> Option<String> {
  dict
    .get(key)
    .and_then(plist::Value::as_string)
    .map(std::string::ToString::to_string)
}

fn dict_bool(dict: &plist::Dictionary, key: &str) -> bool {
  dict.get(key).and_then(plist::Value::as_boolean).unwrap_or(false)
}

fn dict_u64(dict: &plist::Dictionary, key: &str) -> u64 {
  dict
    .get(key)
    .and_then(|value| {
      value
        .as_unsigned_integer()
        .or_else(|| value.as_signed_integer().and_then(|n| u64::try_from(n).ok()))
    })
    .unwrap_or(0)
}

fn dict_u32(dict: &plist::Dictionary, key: &str) -> u32 {
  let raw = dict_u64(dict, key);
  u32::try_from(raw.min(u64::from(u32::MAX))).unwrap_or(0)
}

fn collect_partition_identifiers(disk_info: &plist::Dictionary) -> Vec<String> {
  let mut identifiers = Vec::new();
  if let Some(partitions) = disk_info.get("Partitions").and_then(plist::Value::as_array) {
    for partition in partitions {
      if let Some(part_dict) = as_dict(partition)
        && let Some(identifier) = dict_string(part_dict, "DeviceIdentifier")
      {
        identifiers.push(identifier);
      }
    }
  }
  identifiers
}

/// # Errors
///
/// Returns an error if `diskutil` metadata for the disk or its partitions
/// cannot be read or parsed.
fn build_drive(disk_identifier: &str) -> Result<Option<FlashDrive>, String> {
  let disk_info_value = run_plist(&["info", "-plist", disk_identifier])?;
  let Some(disk_info) = as_dict(&disk_info_value) else {
    return Ok(None);
  };

  if dict_string(disk_info, "VirtualOrPhysical").as_deref() == Some("Virtual") {
    return Ok(None);
  }

  let is_internal = dict_bool(disk_info, "Internal");
  let is_removable = dict_bool(disk_info, "RemovableMediaOrExternalDevice")
    || dict_bool(disk_info, "Removable")
    || dict_bool(disk_info, "DeviceMediaIsRemovable")
    || dict_bool(disk_info, "RemovableMedia");
  let bus_protocol = dict_string(disk_info, "BusProtocol").unwrap_or_default();
  let is_usb = bus_protocol.eq_ignore_ascii_case("USB");
  let is_card = bus_protocol.eq_ignore_ascii_case("Secure Digital") || bus_protocol.contains("SD");

  if is_internal && !is_removable && !is_card {
    return Ok(None);
  }

  let device =
    dict_string(disk_info, "DeviceNode").unwrap_or_else(|| format!("/dev/{disk_identifier}"));
  let raw_device = device.replace("/dev/disk", "/dev/rdisk");
  let description = dict_string(disk_info, "MediaName")
    .or_else(|| dict_string(disk_info, "IORegistryEntryName"))
    .or_else(|| dict_string(disk_info, "VolumeName"))
    .unwrap_or_else(|| disk_identifier.to_string());
  let size = dict_u64(disk_info, "TotalSize");
  let block_size = dict_u32(disk_info, "DeviceBlockSize");
  let is_read_only = !dict_bool(disk_info, "WritableMedia");

  let mut mountpoints = Vec::new();
  for partition_identifier in collect_partition_identifiers(disk_info) {
    if let Ok(part_value) = run_plist(&["info", "-plist", &partition_identifier])
      && let Some(part_dict) = as_dict(&part_value)
      && let Some(mount) = dict_string(part_dict, "MountPoint")
      && !mount.is_empty()
    {
      mountpoints.push(FlashDriveMountpoint {
        path: mount,
        label: dict_string(part_dict, "VolumeName"),
      });
    }
  }

  Ok(Some(FlashDrive {
    device,
    raw_device,
    description,
    size,
    block_size,
    is_read_only,
    is_removable,
    is_usb,
    is_card,
    is_system: false,
    mountpoints,
  }))
}

/// # Errors
///
/// Returns an error if the system disk listing cannot be queried or parsed.
pub fn list_drives() -> Result<Vec<FlashDrive>, String> {
  let listing = run_plist(&["list", "-plist", "physical"])?;
  let Some(root) = as_dict(&listing) else {
    return Ok(Vec::new());
  };
  let mut drives = Vec::new();
  if let Some(disks_array) = root.get("AllDisksAndPartitions").and_then(plist::Value::as_array) {
    for entry in disks_array {
      if let Some(entry_dict) = as_dict(entry)
        && let Some(identifier) = dict_string(entry_dict, "DeviceIdentifier")
        && let Some(drive) = build_drive(&identifier)?
      {
        drives.push(drive);
      }
    }
  }
  Ok(drives)
}

use std::process::Command;

use serde::Deserialize;
use serde_json::Value;

use super::{FlashDrive, FlashDriveMountpoint};

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct PsDisk {
  number: u32,
  friendly_name: Option<String>,
  size: Option<u64>,
  is_boot: Option<bool>,
  is_system: Option<bool>,
  is_read_only: Option<bool>,
  bus_type: Option<String>,
}

fn run_powershell(script: &str) -> Result<String, String> {
  let output = Command::new("powershell")
    .args(["-NoProfile", "-NonInteractive", "-Command", script])
    .output()
    .map_err(|e| format!("Failed to run powershell: {e}"))?;
  if !output.status.success() {
    return Err(format!("powershell failed: {}", String::from_utf8_lossy(&output.stderr)));
  }
  Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn list_disks() -> Result<Vec<PsDisk>, String> {
  let stdout = run_powershell(
    "Get-Disk | Select-Object Number,FriendlyName,Size,IsBoot,IsSystem,IsReadOnly,BusType | ConvertTo-Json -Depth 4",
  )?;
  if stdout.is_empty() {
    return Ok(Vec::new());
  }
  let value: Value =
    serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse Get-Disk JSON: {e}"))?;
  let array = if value.is_array() {
    value
  } else {
    Value::Array(vec![value])
  };
  serde_json::from_value(array).map_err(|e| format!("Failed to map Get-Disk JSON: {e}"))
}

fn list_partition_mountpoints(disk_number: u32) -> Vec<FlashDriveMountpoint> {
  let script = format!(
    "Get-Partition -DiskNumber {disk_number} | Where-Object {{ $_.DriveLetter }} | ForEach-Object {{ $v = Get-Volume -DriveLetter $_.DriveLetter -ErrorAction SilentlyContinue; [pscustomobject]@{{ DriveLetter = [string]$_.DriveLetter; Label = if ($v) {{ $v.FileSystemLabel }} else {{ $null }} }} }} | ConvertTo-Json -Depth 3"
  );
  let Ok(stdout) = run_powershell(&script) else {
    return Vec::new();
  };
  if stdout.is_empty() {
    return Vec::new();
  }
  let Ok(value): Result<Value, _> = serde_json::from_str(&stdout) else {
    return Vec::new();
  };
  let array = if value.is_array() {
    value
  } else {
    Value::Array(vec![value])
  };
  let mut mountpoints = Vec::new();
  if let Value::Array(items) = array {
    for item in items {
      let letter = item.get("DriveLetter").and_then(|v| v.as_str()).unwrap_or("");
      if letter.is_empty() {
        continue;
      }
      let label = item
        .get("Label")
        .and_then(|v| v.as_str())
        .map(std::string::ToString::to_string)
        .filter(|s| !s.is_empty());
      mountpoints.push(FlashDriveMountpoint {
        path: format!("{letter}:\\"),
        label,
      });
    }
  }
  mountpoints
}

pub fn list_drives() -> Result<Vec<FlashDrive>, String> {
  let disks = list_disks()?;
  let mut drives = Vec::new();
  for disk in disks {
    if disk.is_boot.unwrap_or(false) || disk.is_system.unwrap_or(false) {
      continue;
    }
    let bus = disk.bus_type.as_deref().unwrap_or("").to_ascii_lowercase();
    let is_usb = bus == "usb";
    let is_card = bus == "sd" || bus == "mmc";
    let is_removable = is_usb || is_card || bus == "removable";
    if !is_removable {
      continue;
    }
    let device = format!("\\\\.\\PhysicalDrive{}", disk.number);
    let mountpoints = list_partition_mountpoints(disk.number);
    drives.push(FlashDrive {
      device: device.clone(),
      raw_device: device,
      description: disk.friendly_name.unwrap_or_else(|| format!("PhysicalDrive{}", disk.number)),
      size: disk.size.unwrap_or(0),
      block_size: 0,
      is_read_only: disk.is_read_only.unwrap_or(false),
      is_removable,
      is_usb,
      is_card,
      is_system: disk.is_system.unwrap_or(false),
      mountpoints,
    });
  }
  Ok(drives)
}

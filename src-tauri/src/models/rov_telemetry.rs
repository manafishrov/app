use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RovTelemetry {
  pub pitch: f32,
  pub roll: f32,
  pub yaw: f32,
  pub depth: f32,
  pub desired_pitch: f32,
  pub desired_roll: f32,
  pub desired_yaw: f32,
  pub desired_depth: f32,
  pub water_temperature: f32,
  pub electronics_temperature: f32,
  pub thruster_rpms: [f32; 8],
  pub thruster_signal_qualities: [Option<f32>; 8],
  pub work_indicator_percentage: u8,
}

#[cfg(test)]
mod tests {
  use super::RovTelemetry;

  #[test]
  /// # Panics
  /// Panics if unavailable and measured-zero signal qualities are conflated.
  fn distinguishes_unavailable_signal_quality_from_zero() {
    let payload = serde_json::json!({
      "pitch": 0,
      "roll": 0,
      "yaw": 0,
      "depth": 0,
      "desiredPitch": 0,
      "desiredRoll": 0,
      "desiredYaw": 0,
      "desiredDepth": 0,
      "waterTemperature": 0,
      "electronicsTemperature": 0,
      "thrusterRpms": [0, 0, 0, 0, 0, 0, 0, 0],
      "thrusterSignalQualities": [0, null, 100, 100, 100, 100, 100, 100],
      "workIndicatorPercentage": 0
    });

    let telemetry: RovTelemetry = serde_json::from_value(payload).unwrap();

    assert_eq!(telemetry.thruster_signal_qualities[0], Some(0.0));
    assert_eq!(telemetry.thruster_signal_qualities[1], None);
  }
}

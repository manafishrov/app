import type { Row } from '@/stores/rovConfig';

import * as m from '@/paraglide/messages';

export type ThrusterPresetRow = Partial<{
  surge: Row;
  sway: Row;
  heave: Row;
  pitch: Row;
  yaw: Row;
  roll: Row;
  action1: Row;
  action2: Row;
}>;

export type ThrusterPreset = {
  name: string;
  description?: string;
  rows: ThrusterPresetRow;
};

// Thruster thrust multipliers
const FWD = 1;
const REV = -1;
const STOP = 0;

export const THRUSTER_PRESETS: ThrusterPreset[] = [
  {
    name: m.thruster_preset_4_horizontal_name(),
    description: m.thruster_preset_4_horizontal_description(),
    rows: {
      surge: [FWD, FWD, STOP, STOP, REV, REV, STOP, STOP],
      sway: [FWD, REV, STOP, STOP, FWD, REV, STOP, STOP],
      yaw: [REV, FWD, STOP, STOP, FWD, REV, STOP, STOP],
    },
  },
  {
    name: m.thruster_preset_4_vertical_name(),
    description: m.thruster_preset_4_vertical_description(),
    rows: {
      heave: [STOP, STOP, FWD, FWD, STOP, STOP, REV, REV],
      pitch: [STOP, STOP, FWD, REV, STOP, STOP, REV, FWD],
      roll: [STOP, STOP, FWD, REV, STOP, STOP, FWD, REV],
    },
  },
  {
    name: m.thruster_preset_6_vectored_name(),
    description: m.thruster_preset_6_vectored_description(),
    rows: {
      surge: [FWD, FWD, STOP, STOP, STOP, STOP, FWD, FWD],
      sway: [FWD, REV, STOP, STOP, STOP, STOP, REV, FWD],
      heave: [STOP, STOP, FWD, FWD, FWD, FWD, STOP, STOP],
      yaw: [REV, FWD, STOP, STOP, STOP, STOP, FWD, REV],
      pitch: [STOP, STOP, FWD, REV, REV, FWD, STOP, STOP],
      roll: [STOP, STOP, FWD, REV, FWD, REV, STOP, STOP],
    },
  },
  {
    name: m.thruster_preset_8_full_name(),
    description: m.thruster_preset_8_full_description(),
    rows: {
      surge: [FWD, FWD, STOP, STOP, REV, REV, STOP, STOP],
      sway: [FWD, REV, STOP, STOP, FWD, REV, STOP, STOP],
      heave: [STOP, STOP, FWD, FWD, STOP, STOP, FWD, FWD],
      yaw: [REV, FWD, STOP, STOP, FWD, REV, STOP, STOP],
      pitch: [STOP, STOP, FWD, REV, STOP, STOP, REV, FWD],
      roll: [STOP, STOP, FWD, REV, STOP, STOP, FWD, REV],
    },
  },
  {
    name: m.thruster_preset_gripper_action_1_name(),
    description: m.thruster_preset_gripper_action_1_description(),
    rows: {
      action1: [FWD, STOP, STOP, STOP, STOP, STOP, STOP, STOP],
    },
  },
  {
    name: m.thruster_preset_clear_all_name(),
    description: m.thruster_preset_clear_all_description(),
    rows: {
      surge: [STOP, STOP, STOP, STOP, STOP, STOP, STOP, STOP],
      sway: [STOP, STOP, STOP, STOP, STOP, STOP, STOP, STOP],
      heave: [STOP, STOP, STOP, STOP, STOP, STOP, STOP, STOP],
      pitch: [STOP, STOP, STOP, STOP, STOP, STOP, STOP, STOP],
      yaw: [STOP, STOP, STOP, STOP, STOP, STOP, STOP, STOP],
      roll: [STOP, STOP, STOP, STOP, STOP, STOP, STOP, STOP],
      action1: [STOP, STOP, STOP, STOP, STOP, STOP, STOP, STOP],
      action2: [STOP, STOP, STOP, STOP, STOP, STOP, STOP, STOP],
    },
  },
];

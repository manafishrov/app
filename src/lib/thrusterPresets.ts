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

export const THRUSTER_PRESETS: ThrusterPreset[] = [
  {
    name: m.thruster_preset_4_horizontal_name(),
    description: m.thruster_preset_4_horizontal_description(),
    rows: {
      surge: [1, 1, 0, 0, -1, -1, 0, 0],
      sway: [1, -1, 0, 0, 1, -1, 0, 0],
      yaw: [-1, 1, 0, 0, 1, -1, 0, 0],
    },
  },
  {
    name: m.thruster_preset_4_vertical_name(),
    description: m.thruster_preset_4_vertical_description(),
    rows: {
      heave: [0, 0, 1, 1, 0, 0, -1, -1],
      pitch: [0, 0, 1, -1, 0, 0, -1, 1],
      roll: [0, 0, 1, -1, 0, 0, 1, -1],
    },
  },
  {
    name: m.thruster_preset_6_vectored_name(),
    description: m.thruster_preset_6_vectored_description(),
    rows: {
      surge: [1, 1, 0, 0, 0, 0, 1, 1],
      sway: [1, -1, 0, 0, 0, 0, -1, 1],
      heave: [0, 0, 1, 1, 1, 1, 0, 0],
      yaw: [-1, 1, 0, 0, 0, 0, 1, -1],
      pitch: [0, 0, 1, -1, -1, 1, 0, 0],
      roll: [0, 0, 1, -1, 1, -1, 0, 0],
    },
  },
  {
    name: m.thruster_preset_8_full_name(),
    description: m.thruster_preset_8_full_description(),
    rows: {
      surge: [1, 1, 0, 0, -1, -1, 0, 0],
      sway: [1, -1, 0, 0, 1, -1, 0, 0],
      heave: [0, 0, 1, 1, 0, 0, 1, 1],
      yaw: [-1, 1, 0, 0, 1, -1, 0, 0],
      pitch: [0, 0, 1, -1, 0, 0, -1, 1],
      roll: [0, 0, 1, -1, 0, 0, 1, -1],
    },
  },
  {
    name: m.thruster_preset_gripper_action_1_name(),
    description: m.thruster_preset_gripper_action_1_description(),
    rows: {
      action1: [1, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  {
    name: m.thruster_preset_clear_all_name(),
    description: m.thruster_preset_clear_all_description(),
    rows: {
      surge: [0, 0, 0, 0, 0, 0, 0, 0],
      sway: [0, 0, 0, 0, 0, 0, 0, 0],
      heave: [0, 0, 0, 0, 0, 0, 0, 0],
      pitch: [0, 0, 0, 0, 0, 0, 0, 0],
      yaw: [0, 0, 0, 0, 0, 0, 0, 0],
      roll: [0, 0, 0, 0, 0, 0, 0, 0],
      action1: [0, 0, 0, 0, 0, 0, 0, 0],
      action2: [0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
];

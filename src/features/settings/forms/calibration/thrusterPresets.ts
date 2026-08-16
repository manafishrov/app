/* oxlint-disable no-magic-numbers */
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
    name: m.thruster_preset_zero_name(),
    description: m.thruster_preset_zero_description(),
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
  {
    name: m.thruster_preset_default_movement_name(),
    description: m.thruster_preset_default_movement_description(),
    rows: {
      surge: [1, 1, 0, 0, 0, 0, -1, -1],
      sway: [1, -1, 0, 0, 0, 0, 1, -1],
      heave: [0, 0, -1, -1, -1, -1, 0, 0],
      pitch: [0, 0, 1, 1, -1, -1, 0, 0],
      yaw: [1, -1, 0, 0, 0, 0, -1, 1],
      roll: [0, 0, 1, -1, 1, -1, 0, 0],
      action1: [0, 0, 0, 0, 0, 0, 0, 0],
      action2: [0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  {
    name: m.thruster_preset_default_stability_name(),
    description: m.thruster_preset_default_stability_description(),
    rows: {
      surge: [0, 0, 0, 0, 1, 1, -1, -1],
      sway: [0, 0, 0, 0, -1, 1, -1, 1],
      heave: [-1, -1, -1, -1, 0, 0, 0, 0],
      pitch: [1, 1, -1, -1, 0, 0, 0, 0],
      yaw: [0, 0, 0, 0, 1, -1, -1, 1],
      roll: [1, -1, 1, -1, 0, 0, 0, 0],
      action1: [0, 0, 0, 0, 0, 0, 0, 0],
      action2: [0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  {
    name: m.thruster_preset_speedy_name(),
    description: m.thruster_preset_speedy_description(),
    rows: {
      surge: [1, 1, 1, 1, 0, 0, 0, 0],
      sway: [0, 0, 0, 0, 0, 0, 0, 0],
      heave: [0, 0, 0, 0, -1, -1, 0, 0],
      pitch: [-1, -1, 1, 1, 0, 0, 0, 0],
      yaw: [-1, 1, -1, 1, 0, 0, 0, 0],
      roll: [0, 0, 0, 0, -1, 1, 0, 0],
      action1: [0, 0, 0, 0, 0, 0, 0, 0],
      action2: [0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  {
    name: m.thruster_preset_speedy_w_actions_name(),
    description: m.thruster_preset_speedy_w_actions_description(),
    rows: {
      surge: [1, 1, 1, 1, 0, 0, 0, 0],
      sway: [0, 0, 0, 0, 0, 0, 0, 0],
      heave: [0, 0, 0, 0, -1, -1, 0, 0],
      pitch: [-1, -1, 1, 1, 0, 0, 0, 0],
      yaw: [-1, 1, -1, 1, 0, 0, 0, 0],
      roll: [0, 0, 0, 0, -1, 1, 0, 0],
      action1: [0, 0, 0, 0, 0, 0, 1, 0],
      action2: [0, 0, 0, 0, 0, 0, 0, 1],
    },
  },
  {
    name: m.thruster_preset_silly_shuffle_name(),
    description: m.thruster_preset_silly_shuffle_description(),
    rows: {
      surge: [1, -0.4201, 0, -0.001, 0, -0.999, 0, -0.808],
      sway: [1, 0.123, -0.987, 0.456, -0.321, 0, -1, 0.654],
      heave: [0, 0, 0, 1, 0, 0, 0, 0],
      pitch: [-0.555, -1, -0.004, 0.222, -0.888, -1, -0.246, 1],
      yaw: [0.001, -0.742, 0.666, -0.123, 0.808, 0, 0.271, -0.314],
      roll: [-0.777, 0.222, -0.135, 0.999, 1, 0, -0, 0.888],
      action1: [-1, -0.271, 0.0001, -0.654, 0.777, 0, 0.369, 0],
      action2: [-0.042, 0.531, -0.999, 0, -0.314, 0.222, -0.888, 0.456],
    },
  },
];

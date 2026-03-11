import type { Row } from '@/stores/rovConfig';

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
    name: '4-Thruster Horizontal',
    description: 'Standard 4-thruster setup for horizontal movement',
    rows: {
      surge: [1, 1, 0, 0, -1, -1, 0, 0],
      sway: [1, -1, 0, 0, 1, -1, 0, 0],
      yaw: [-1, 1, 0, 0, 1, -1, 0, 0],
    },
  },
  {
    name: '4-Thruster Vertical',
    description: 'Standard 4-thruster setup for vertical movement',
    rows: {
      heave: [0, 0, 1, 1, 0, 0, -1, -1],
      pitch: [0, 0, 1, -1, 0, 0, -1, 1],
      roll: [0, 0, 1, -1, 0, 0, 1, -1],
    },
  },
  {
    name: '6-Thruster Vectored',
    description: '6-thruster vectored configuration',
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
    name: '8-Thruster Full',
    description: 'Full 8-thruster configuration',
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
    name: 'Gripper Action1',
    description: 'Gripper action 1 configuration',
    rows: {
      action1: [1, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  {
    name: 'Clear All',
    description: 'Set all values to 0',
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

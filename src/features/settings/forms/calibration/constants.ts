import * as m from '@/paraglide/messages';

import type { ThrusterPresetRow } from './thrusterPresets';

const NEGATIVE_ONE = Number('-1');
const ZERO = Number('0');
const ONE = Number('1');
const DECIMAL_RADIX = Number('10');
const DECIMAL_PRECISION_FACTOR = Number('100');
const THRUSTER_TEST_TIMEOUT_MS = Number('2000');
const ALLOCATION_FIELD_STEP = Number('0.01');
const DEADZONE_FIELD_STEP = Number('0.01');
const DEADZONE_THRESHOLD = Number('0.2');

const THRUSTER_COLUMN_VALUES = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
const PIN_VALUE_STRINGS = ['6', '7', '8', '9', '18', '19', '20', '21'] as const;

const THRUSTER_INDICES = ['0', '1', '2', '3', '4', '5', '6', '7'].map((value) =>
  Number.parseInt(value, DECIMAL_RADIX),
);
const THRUSTER_COLUMNS = THRUSTER_COLUMN_VALUES.map((value) =>
  Number.parseInt(value, DECIMAL_RADIX),
);
const PIN_NUMBERS = PIN_VALUE_STRINGS.map((value) => Number.parseInt(value, DECIMAL_RADIX));
const [
  THRUSTER_0,
  THRUSTER_1,
  THRUSTER_2,
  THRUSTER_3,
  THRUSTER_4,
  THRUSTER_5,
  THRUSTER_6,
  THRUSTER_7,
] = THRUSTER_INDICES;
const PRESET_ROW_KEYS: (keyof ThrusterPresetRow)[] = [
  'surge',
  'sway',
  'heave',
  'pitch',
  'yaw',
  'roll',
  'action1',
  'action2',
];

const ROW_LABELS = [
  m.calibration_thruster_allocation_surge(),
  m.calibration_thruster_allocation_sway(),
  m.calibration_thruster_allocation_heave(),
  m.calibration_thruster_allocation_pitch(),
  m.calibration_thruster_allocation_yaw(),
  m.calibration_thruster_allocation_roll(),
  m.calibration_thruster_allocation_action_1(),
  m.calibration_thruster_allocation_action_2(),
] as const;
const ROW_LABEL_TOOLTIPS = [
  m.calibration_thruster_allocation_surge_tooltip(),
  m.calibration_thruster_allocation_sway_tooltip(),
  m.calibration_thruster_allocation_heave_tooltip(),
  m.calibration_thruster_allocation_pitch_tooltip(),
  m.calibration_thruster_allocation_yaw_tooltip(),
  m.calibration_thruster_allocation_roll_tooltip(),
  m.calibration_thruster_allocation_action_1_tooltip(),
  m.calibration_thruster_allocation_action_2_tooltip(),
] as const;

export {
  ALLOCATION_FIELD_STEP,
  DEADZONE_FIELD_STEP,
  DEADZONE_THRESHOLD,
  DECIMAL_PRECISION_FACTOR,
  DECIMAL_RADIX,
  NEGATIVE_ONE,
  ONE,
  PIN_NUMBERS,
  PRESET_ROW_KEYS,
  ROW_LABEL_TOOLTIPS,
  ROW_LABELS,
  THRUSTER_0,
  THRUSTER_1,
  THRUSTER_2,
  THRUSTER_3,
  THRUSTER_4,
  THRUSTER_5,
  THRUSTER_6,
  THRUSTER_7,
  THRUSTER_COLUMNS,
  THRUSTER_INDICES,
  THRUSTER_TEST_TIMEOUT_MS,
  ZERO,
};

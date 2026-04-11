import { z } from 'zod';

import type { AxisConfig } from '@/stores/rovConfig';

import * as m from '@/paraglide/messages';

import {
  MAX_DEPTH_RATE,
  MAX_PID_VALUE,
  MAX_TURN_RATE,
  MIN_DEPTH_RATE,
  MIN_TURN_RATE,
} from './constants';

const PID_FIELDS = {
  kp: z
    .number()
    .min(0, m.validation_must_be_at_least_0())
    .max(MAX_PID_VALUE, m.validation_must_be_at_most_100()),
  ki: z
    .number()
    .min(0, m.validation_must_be_at_least_0())
    .max(MAX_PID_VALUE, m.validation_must_be_at_most_100()),
  kd: z
    .number()
    .min(0, m.validation_must_be_at_least_0())
    .max(MAX_PID_VALUE, m.validation_must_be_at_most_100()),
};

const AXIS_SCHEMA = z.object({
  ...PID_FIELDS,
  rate: z
    .array(z.number().max(MAX_TURN_RATE, m.validation_must_be_at_most_360()))
    .length(1)
    .refine(([rate]) => typeof rate !== 'number' || rate >= MIN_TURN_RATE, {
      message: m.validation_turn_rate_at_least_5(),
    }),
});

const DEPTH_AXIS_SCHEMA = z.object({
  ...PID_FIELDS,
  rate: z
    .array(z.number().max(MAX_DEPTH_RATE, m.validation_must_be_at_most_3()))
    .length(1)
    .refine(([rate]) => typeof rate !== 'number' || rate >= MIN_DEPTH_RATE, {
      message: m.validation_depth_rate_at_least_1(),
    }),
});

const FORM_SCHEMA = z.object({
  pitch: AXIS_SCHEMA,
  yaw: AXIS_SCHEMA,
  roll: AXIS_SCHEMA,
  depth: DEPTH_AXIS_SCHEMA,
  surge: z
    .number()
    .min(0, m.validation_must_be_at_least_0())
    .max(MAX_PID_VALUE, m.validation_must_be_at_most_100()),
  heave: z
    .number()
    .min(0, m.validation_must_be_at_least_0())
    .max(MAX_PID_VALUE, m.validation_must_be_at_most_100()),
  sway: z
    .number()
    .min(0, m.validation_must_be_at_least_0())
    .max(MAX_PID_VALUE, m.validation_must_be_at_most_100()),
});

export const createFormSchema = (): typeof FORM_SCHEMA => FORM_SCHEMA;

export type FormValues = {
  pitch: Omit<AxisConfig, 'rate'> & { rate: number[] };
  yaw: Omit<AxisConfig, 'rate'> & { rate: number[] };
  roll: Omit<AxisConfig, 'rate'> & { rate: number[] };
  depth: Omit<AxisConfig, 'rate'> & { rate: number[] };
  surge: number;
  heave: number;
  sway: number;
};

export const REGULATOR_FORM_DEFAULT_VALUES: FormValues = {
  pitch: { kp: 3, ki: 2, kd: 0.5, rate: [100] },
  yaw: { kp: 3, ki: 2, kd: 0.5, rate: [100] },
  roll: { kp: 3, ki: 2, kd: 0.5, rate: [100] },
  depth: { kp: 2, ki: 0.5, kd: 0.1, rate: [0.5] },
  surge: 0,
  heave: 0,
  sway: 0,
};

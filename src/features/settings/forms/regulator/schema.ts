import { z } from 'zod';

import type { AxisConfig } from '@/stores/rovConfig';

import * as m from '@/paraglide/messages';

import { MAX_PID_VALUE, MAX_TURN_RATE, MIN_TURN_RATE } from './constants';

const AXIS_SCHEMA = z.object({
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
  rate: z
    .array(z.number().max(MAX_TURN_RATE, m.validation_must_be_at_most_360()))
    .length(1)
    .refine(([rate]) => typeof rate !== 'number' || rate >= MIN_TURN_RATE, {
      message: m.validation_turn_rate_at_least_5(),
    }),
});

const FORM_SCHEMA = z.object({
  pitch: AXIS_SCHEMA,
  yaw: AXIS_SCHEMA,
  roll: AXIS_SCHEMA,
  depth: AXIS_SCHEMA,
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
  pitch: { kp: 0, ki: 0, kd: 0, rate: [MIN_TURN_RATE] },
  yaw: { kp: 0, ki: 0, kd: 0, rate: [MIN_TURN_RATE] },
  roll: { kp: 0, ki: 0, kd: 0, rate: [MIN_TURN_RATE] },
  depth: { kp: 0, ki: 0, kd: 0, rate: [MIN_TURN_RATE] },
  surge: 0,
  heave: 0,
  sway: 0,
};

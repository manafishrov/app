import { z } from 'zod';

import type { AxisConfig } from '@/stores/rovConfig';

import * as m from '@/paraglide/messages';

import { MAX_PID_VALUE, MAX_TURN_RATE, MIN_TURN_RATE } from './constants';

const createAxisSchema = (): z.ZodType<FormValues['pitch']> =>
  z.object({
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createFormSchema = (): z.ZodType<FormValues, any, any> => {
  const axisSchema = createAxisSchema();

  return z.object({
    pitch: axisSchema,
    yaw: axisSchema,
    roll: axisSchema,
    depth: axisSchema,
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
};

export type FormValues = {
  pitch: Omit<AxisConfig, 'rate'> & { rate: number[] };
  yaw: Omit<AxisConfig, 'rate'> & { rate: number[] };
  roll: Omit<AxisConfig, 'rate'> & { rate: number[] };
  depth: Omit<AxisConfig, 'rate'> & { rate: number[] };
  surge: number;
  heave: number;
  sway: number;
};

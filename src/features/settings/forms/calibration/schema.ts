import { z } from 'zod';

import { NEGATIVE_ONE, ONE, THRUSTER_INDICES } from './constants';

export const IDENTIFIER_VALUES = ['0', '1', '2', '3', '4', '5', '6', '7'] as const;
const SPIN_DIRECTION_VALUES = ['1', '-1'] as const;

export const identifierSchema = z.enum(IDENTIFIER_VALUES);
export const spinDirectionSchema = z.enum(SPIN_DIRECTION_VALUES);

export type IdentifierValue = z.infer<typeof identifierSchema>;
export type SpinDirectionValue = z.infer<typeof spinDirectionSchema>;

export const formSchema = z.object({
  thrusterPinSetup: z.object({
    identifiers: z.array(identifierSchema).length(THRUSTER_INDICES.length),
    spinDirections: z.array(spinDirectionSchema).length(THRUSTER_INDICES.length),
  }),
  thrusterAllocation: z
    .array(z.array(z.number().min(NEGATIVE_ONE).max(ONE)).length(THRUSTER_INDICES.length))
    .length(THRUSTER_INDICES.length),
});

export type FormValues = z.infer<typeof formSchema>;

export const CALIBRATION_FORM_DEFAULT_VALUES: FormValues = {
  thrusterPinSetup: {
    identifiers: [...IDENTIFIER_VALUES],
    spinDirections: THRUSTER_INDICES.map((): SpinDirectionValue => '1'),
  },
  thrusterAllocation: THRUSTER_INDICES.map(() => THRUSTER_INDICES.map(() => 0)),
};

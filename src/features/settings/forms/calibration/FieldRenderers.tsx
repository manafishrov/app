import type { JSXElement } from 'solid-js';

import { createListCollection } from '@ark-ui/solid/collection';
import {
  Select,
  SelectContent,
  SelectControl,
  SelectIndicator,
  SelectItem,
  SelectList,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@manafishrov/ui/select';
import { Portal } from 'solid-js/web';
import { z } from 'zod';

import * as m from '@/paraglide/messages';

export const IDENTIFIER_VALUES = ['0', '1', '2', '3', '4', '5', '6', '7'] as const;
const SPIN_DIRECTION_VALUES = ['1', '-1'] as const;

export const identifierSchema = z.enum(IDENTIFIER_VALUES);
export const spinDirectionSchema = z.enum(SPIN_DIRECTION_VALUES);

export type IdentifierValue = z.infer<typeof identifierSchema>;
export type SpinDirectionValue = z.infer<typeof spinDirectionSchema>;

type CalibrationFieldAccessor = (() => {
  state: { value: unknown; meta: { errors: unknown[] } };
  handleChange: (value: unknown) => void;
  handleBlur: () => void;
}) & {
  NumberInputField: (props: {
    class?: string;
    inputMode?: 'decimal' | 'numeric' | 'text' | 'search' | 'tel' | 'url' | 'email' | 'none';
    showTriggers?: boolean;
    min?: number;
    max?: number;
    step?: number;
    allowOverflow?: boolean;
    clampValueOnBlur?: boolean;
  }) => JSXElement;
};

type CalibrationFormLike = {
  AppField: (props: {
    name:
      | `thrusterAllocation[${number}][${number}]`
      | 'thrusterPinSetup'
      | 'thrusterAllocation'
      | 'thrusterPinSetup.identifiers'
      | `thrusterPinSetup.identifiers[${number}]`
      | 'thrusterPinSetup.spinDirections'
      | `thrusterPinSetup.spinDirections[${number}]`
      | `thrusterAllocation[${number}]`;
    children: (field: unknown) => JSXElement;
  }) => JSXElement;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value instanceof Object && value !== null;

const isCalibrationFieldAccessor = (value: unknown): value is CalibrationFieldAccessor => {
  if (typeof value !== 'function') {
    return false;
  }
  if (!isRecord(value)) {
    return false;
  }
  if (!('NumberInputField' in value) || typeof value['NumberInputField'] !== 'function') {
    return false;
  }
  return true;
};

export const createIdentifierCollection = (
  thrusterIndices: readonly number[],
  oneValue: number,
): ReturnType<typeof createListCollection<{ value: string; label: string }>> =>
  createListCollection<{ value: string; label: string }>({
    items: thrusterIndices.map((index) => ({
      value: String(index),
      label: String(index + oneValue),
    })),
  });

const spinDirectionCollection = createListCollection<{ value: string; label: string }>({
  items: [
    { value: '1', label: m.calibration_thruster_pin_setup_spin_direction_normal() },
    { value: '-1', label: m.calibration_thruster_pin_setup_spin_direction_reversed() },
  ],
});

export const renderIdentifierField = (args: {
  form: CalibrationFormLike;
  index: number;
  zeroValue: number;
  identifierCollection: ReturnType<typeof createIdentifierCollection>;
}): JSXElement => (
  <args.form.AppField name={`thrusterPinSetup.identifiers[${args.index}]`}>
    {(field): JSXElement => {
      if (!isCalibrationFieldAccessor(field)) {
        return <></>;
      }

      return (
        <Select
          class='w-16'
          collection={args.identifierCollection}
          value={[String(field().state.value)]}
          onValueChange={(details): void => {
            const parsed = identifierSchema.safeParse(details.value[args.zeroValue]);
            if (parsed.success) {
              field().handleChange(parsed.data);
            }
          }}
          onBlur={() => {
            field().handleBlur();
          }}
          invalid={field().state.meta.errors.length > args.zeroValue}
        >
          <SelectControl>
            <SelectTrigger>
              <SelectValue />
              <SelectIndicator />
            </SelectTrigger>
          </SelectControl>
          <Portal>
            <SelectPositioner>
              <SelectContent>
                <SelectList>
                  <For each={args.identifierCollection.items}>
                    {(item): JSXElement => <SelectItem item={item}>{item.label}</SelectItem>}
                  </For>
                </SelectList>
              </SelectContent>
            </SelectPositioner>
          </Portal>
        </Select>
      );
    }}
  </args.form.AppField>
);

export const renderSpinDirectionField = (
  form: CalibrationFormLike,
  index: number,
  zeroValue: number,
): JSXElement => (
  <form.AppField name={`thrusterPinSetup.spinDirections[${index}]`}>
    {(field): JSXElement => {
      if (!isCalibrationFieldAccessor(field)) {
        return <></>;
      }

      return (
        <Select
          class='w-28'
          collection={spinDirectionCollection}
          value={[String(field().state.value)]}
          onValueChange={(details): void => {
            const parsed = spinDirectionSchema.safeParse(details.value[zeroValue]);
            if (parsed.success) {
              field().handleChange(parsed.data);
            }
          }}
          onBlur={() => {
            field().handleBlur();
          }}
          invalid={field().state.meta.errors.length > zeroValue}
        >
          <SelectControl>
            <SelectTrigger>
              <SelectValue />
              <SelectIndicator />
            </SelectTrigger>
          </SelectControl>
          <Portal>
            <SelectPositioner>
              <SelectContent>
                <SelectList>
                  <For each={spinDirectionCollection.items}>
                    {(item): JSXElement => <SelectItem item={item}>{item.label}</SelectItem>}
                  </For>
                </SelectList>
              </SelectContent>
            </SelectPositioner>
          </Portal>
        </Select>
      );
    }}
  </form.AppField>
);

export const renderAllocationField = (args: {
  form: CalibrationFormLike;
  rowIndex: number;
  columnIndex: number;
  minimumValue: number;
  maximumValue: number;
  stepValue: number;
}): JSXElement => (
  <args.form.AppField name={`thrusterAllocation[${args.rowIndex}][${args.columnIndex}]`}>
    {(field): JSXElement => {
      if (!isCalibrationFieldAccessor(field)) {
        return <></>;
      }

      return (
        <field.NumberInputField
          class='text-center px-1'
          inputMode='decimal'
          showTriggers={false}
          min={args.minimumValue}
          max={args.maximumValue}
          step={args.stepValue}
          allowOverflow={false}
          clampValueOnBlur
        />
      );
    }}
  </args.form.AppField>
);

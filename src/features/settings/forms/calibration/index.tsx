import type { Component, JSXElement } from 'solid-js';

import { useAppForm } from '@manafishrov/ui/form';
import { toast } from '@manafishrov/ui/toaster';
import { invoke } from '@tauri-apps/api/core';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import {
  type NullspaceVectors,
  type Row,
  type ThrusterAllocation,
  type ThrusterPinSetup,
  rovConfigStore,
} from '@/stores/rovConfig';
import { setRovConfig } from '@/tauri';

import type { ThrusterPresetRow } from './thrusterPresets';

import { CalibrationFormLayout } from './CalibrationFormLayout';
import {
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
} from './constants';
import { createIdentifierCollection } from './FieldRenderers';
import {
  formSchema,
  identifierSchema,
  type FormValues,
  type IdentifierValue,
  type SpinDirectionValue,
} from './schema';
const DEFAULT_IDENTIFIER_VALUE: IdentifierValue = '0';
type AllocationFieldPath = `thrusterAllocation[${number}][${number}]`;
const identifierCollection = createIdentifierCollection(THRUSTER_INDICES, ONE);

type ThrusterIndex = (typeof THRUSTER_INDICES)[number];
type ThrusterTuple<TValue> = [TValue, TValue, TValue, TValue, TValue, TValue, TValue, TValue];

const mapThrusterTuple = <TValue,>(
  mapValue: (index: ThrusterIndex) => TValue,
): ThrusterTuple<TValue> => [
  mapValue(THRUSTER_0 ?? ZERO),
  mapValue(THRUSTER_1 ?? ZERO),
  mapValue(THRUSTER_2 ?? ZERO),
  mapValue(THRUSTER_3 ?? ZERO),
  mapValue(THRUSTER_4 ?? ZERO),
  mapValue(THRUSTER_5 ?? ZERO),
  mapValue(THRUSTER_6 ?? ZERO),
  mapValue(THRUSTER_7 ?? ZERO),
];

const transpose = (matrix: number[][]): number[][] => {
  const firstRow = matrix[ZERO] ?? [];
  return firstRow.map((_, columnIndex) => matrix.map((row) => row[columnIndex] ?? ZERO));
};

const clampThrusterValue = (value: number): number => {
  if (!Number.isFinite(value)) {
    return ZERO;
  }
  const clampedValue = Math.max(NEGATIVE_ONE, Math.min(ONE, value));
  return Math.round(clampedValue * DECIMAL_PRECISION_FACTOR) / DECIMAL_PRECISION_FACTOR;
};

const toClampedRow = (values: number[] | undefined, fallback: Row): Row =>
  mapThrusterTuple((index) => {
    const valueAtIndex = values ? values[index] : fallback[index];
    return clampThrusterValue(valueAtIndex ?? fallback[index] ?? ZERO);
  });

const toIdentifierValue = (value: number): IdentifierValue => {
  const parsed = String(Math.max(ZERO, Math.min(THRUSTER_INDICES.length - ONE, Math.trunc(value))));
  const result = identifierSchema.safeParse(parsed);
  return result.success ? result.data : DEFAULT_IDENTIFIER_VALUE;
};

const toSpinDirectionValue = (value: number): SpinDirectionValue =>
  value === NEGATIVE_ONE ? '-1' : '1';

const parseIdentifier = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, DECIMAL_RADIX);
  return Number.isInteger(parsed)
    ? Math.max(ZERO, Math.min(THRUSTER_INDICES.length - ONE, parsed))
    : fallback;
};

const parseSpinDirection = (value: string, fallback: number): number => {
  if (value === '-1') {
    return NEGATIVE_ONE;
  }
  if (value === '1') {
    return ONE;
  }
  return fallback === NEGATIVE_ONE ? NEGATIVE_ONE : ONE;
};

const EMPTY_ROW: Row = [ZERO, ZERO, ZERO, ZERO, ZERO, ZERO, ZERO, ZERO];
const createEmptyAllocationRows = (): ThrusterAllocation => [
  [...EMPTY_ROW],
  [...EMPTY_ROW],
  [...EMPTY_ROW],
  [...EMPTY_ROW],
  [...EMPTY_ROW],
  [...EMPTY_ROW],
  [...EMPTY_ROW],
  [...EMPTY_ROW],
];

const createCalibrationFormValues = (): FormValues => ({
  thrusterPinSetup: {
    identifiers: rovConfigStore.thrusterPinSetup.identifiers.map((value) =>
      toIdentifierValue(value),
    ),
    spinDirections: rovConfigStore.thrusterPinSetup.spinDirections.map((value) =>
      toSpinDirectionValue(value),
    ),
  },
  thrusterAllocation: transpose(rovConfigStore.thrusterAllocation),
  nullspaceVectors: rovConfigStore.nullspaceVectors.map((row) => toClampedRow(row, EMPTY_ROW)),
});

const toNullspaceVectors = (rows: number[][]): NullspaceVectors =>
  rows.map((row) => toClampedRow(row, EMPTY_ROW));

const submitCalibrationForm = (value: FormValues): Promise<void> => {
  const currentPinSetup = rovConfigStore.thrusterPinSetup;
  const currentAllocation = rovConfigStore.thrusterAllocation;
  const fallbackAllocationRow = currentAllocation[ZERO] ?? EMPTY_ROW;
  const thrusterPinSetup: ThrusterPinSetup = {
    identifiers: mapThrusterTuple((index) =>
      parseIdentifier(
        value.thrusterPinSetup.identifiers[index] ?? '',
        currentPinSetup.identifiers[index] ?? ZERO,
      ),
    ),
    spinDirections: mapThrusterTuple((index) =>
      parseSpinDirection(
        value.thrusterPinSetup.spinDirections[index] ?? '',
        currentPinSetup.spinDirections[index] ?? ONE,
      ),
    ),
  };
  const currentAllocationRows = transpose(currentAllocation);
  const normalizedDisplayRows: ThrusterTuple<Row> = mapThrusterTuple((index) =>
    toClampedRow(
      value.thrusterAllocation[index],
      toClampedRow(currentAllocationRows[index], currentAllocation[index] ?? fallbackAllocationRow),
    ),
  );
  const allocationByThruster = transpose(normalizedDisplayRows);
  const thrusterAllocation: ThrusterAllocation = mapThrusterTuple((index) =>
    toClampedRow(allocationByThruster[index], currentAllocation[index] ?? fallbackAllocationRow),
  );
  const nullspaceVectors = toNullspaceVectors(value.nullspaceVectors);
  return setRovConfig({ thrusterPinSetup, thrusterAllocation, nullspaceVectors });
};

const testThruster = (
  setDisabled: (setter: (previous: boolean[]) => boolean[]) => boolean[],
  index: number,
): void => {
  setDisabled((previous) => {
    const next = [...previous];
    next[index] = true;
    return next;
  });
  invoke('start_thruster_test', { payload: index })
    .catch((error: unknown): void => {
      logError('Failed to start thruster test:', error);
      toast.create({ title: m.toasts_failed_to_start_thruster_test(), type: 'error' });
    })
    .finally((): void => {
      setTimeout(() => {
        setDisabled((previous) => {
          const next = [...previous];
          next[index] = false;
          return next;
        });
      }, THRUSTER_TEST_TIMEOUT_MS);
    });
};

const applyPresetToForm = (
  form: { setFieldValue: (field: AllocationFieldPath, value: number) => void },
  presetRows: ThrusterPresetRow,
): void => {
  for (const [rowIndex, key] of PRESET_ROW_KEYS.entries()) {
    const presetRow = presetRows[key];
    if (presetRow) {
      for (const [columnIndex, value] of presetRow.entries()) {
        form.setFieldValue(
          `thrusterAllocation[${rowIndex}][${columnIndex}]`,
          clampThrusterValue(value),
        );
      }
    }
  }
};

const resetAllocationInForm = (
  form: { setFieldValue: (field: AllocationFieldPath, value: number) => void },
  allocation: number[][],
): void => {
  for (const [rowIndex, row] of allocation.entries()) {
    for (const [columnIndex, value] of row.entries()) {
      form.setFieldValue(`thrusterAllocation[${rowIndex}][${columnIndex}]`, value);
    }
  }
};

export const Calibration: Component = (): JSXElement => {
  const defaultDisabled = Array.from({ length: PIN_NUMBERS.length }, () => false);
  const [testDisabled, setTestDisabled] = createSignal(defaultDisabled);
  const form = useAppForm(() => ({
    validators: { onChange: formSchema, onSubmit: formSchema },
    defaultValues: createCalibrationFormValues(),
    onSubmit: ({ value }: { value: FormValues }): Promise<void> =>
      submitCalibrationForm(value).then(() => {
        form.reset(value);
      }),
  }));

  return (
    <CalibrationFormLayout
      form={form}
      pinNumbers={PIN_NUMBERS}
      thrusterColumns={THRUSTER_COLUMNS}
      rowLabels={ROW_LABELS}
      rowLabelTooltips={ROW_LABEL_TOOLTIPS}
      identifierCollection={identifierCollection}
      zeroValue={ZERO}
      testDisabled={testDisabled}
      onTestThruster={(index): void => {
        testThruster(setTestDisabled, index);
      }}
      onApplyPreset={(presetRows): void => {
        applyPresetToForm(form, presetRows);
      }}
      onResetAllocation={(): void => {
        resetAllocationInForm(form, createEmptyAllocationRows());
      }}
    />
  );
};

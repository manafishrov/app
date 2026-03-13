import type { JSX } from 'solid-js';

import type { ThrusterPresetRow } from '@/lib/thrusterPresets';

import {
  ALLOCATION_FIELD_STEP,
  NEGATIVE_ONE,
  ONE,
  PIN_NUMBERS,
  ROW_LABEL_TOOLTIPS,
  ROW_LABELS,
  THRUSTER_COLUMNS,
  ZERO,
} from './calibration.constants';
import {
  type createIdentifierCollection,
  renderAllocationField,
  renderIdentifierField,
  renderSpinDirectionField,
} from './Calibration.fields';
import { CalibrationFormLayout } from './Calibration.parts';

type CalibrationFieldName =
  | `thrusterAllocation[${number}][${number}]`
  | 'thrusterPinSetup'
  | 'thrusterAllocation'
  | 'thrusterPinSetup.identifiers'
  | `thrusterPinSetup.identifiers[${number}]`
  | 'thrusterPinSetup.spinDirections'
  | `thrusterPinSetup.spinDirections[${number}]`
  | `thrusterAllocation[${number}]`;

type RenderCalibrationLayoutArgs = {
  form: {
    AppField: (props: {
      name: CalibrationFieldName;
      children: (field: unknown) => JSX.Element;
    }) => JSX.Element;
    AppForm: (props: { children: JSX.Element }) => JSX.Element;
    Form: (props: { class?: string; children: JSX.Element }) => JSX.Element;
    AutoSubmit: (props: Record<string, never>) => JSX.Element;
  };
  identifierCollection: ReturnType<typeof createIdentifierCollection>;
  testDisabled: () => boolean[];
  onTestThruster: (index: number) => void;
  onApplyPreset: (presetRows: Partial<ThrusterPresetRow>) => void;
  onResetAllocation: () => void;
};

const renderCalibrationLayout = (args: RenderCalibrationLayoutArgs): JSX.Element => {
  const formLike = { AppField: args.form.AppField };
  return (
    <CalibrationFormLayout
      pinNumbers={PIN_NUMBERS}
      thrusterColumns={THRUSTER_COLUMNS}
      rowLabels={ROW_LABELS}
      rowLabelTooltips={ROW_LABEL_TOOLTIPS}
      zeroValue={ZERO}
      testDisabled={args.testDisabled}
      onTestThruster={args.onTestThruster}
      onApplyPreset={args.onApplyPreset}
      onResetAllocation={args.onResetAllocation}
      renderIdentifierField={(index) =>
        renderIdentifierField({
          form: formLike,
          index,
          zeroValue: ZERO,
          identifierCollection: args.identifierCollection,
        })
      }
      renderSpinDirectionField={(index) => renderSpinDirectionField(formLike, index, ZERO)}
      renderAllocationField={(rowIndex, columnIndex) =>
        renderAllocationField({
          form: formLike,
          rowIndex,
          columnIndex,
          minimumValue: NEGATIVE_ONE,
          maximumValue: ONE,
          stepValue: ALLOCATION_FIELD_STEP,
        })
      }
      AppForm={args.form.AppForm}
      Form={args.form.Form}
      AutoSubmit={args.form.AutoSubmit}
    />
  );
};

export { renderCalibrationLayout };

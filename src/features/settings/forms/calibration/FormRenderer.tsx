import type { JSXElement } from 'solid-js';

import type { ThrusterPresetRow } from './thrusterPresets';

import { CalibrationFormLayout } from './CalibrationFormLayout';
import {
  ALLOCATION_FIELD_STEP,
  NEGATIVE_ONE,
  ONE,
  PIN_NUMBERS,
  ROW_LABEL_TOOLTIPS,
  ROW_LABELS,
  THRUSTER_COLUMNS,
  ZERO,
} from './constants';
import {
  type createIdentifierCollection,
  renderAllocationField,
  renderIdentifierField,
  renderSpinDirectionField,
} from './FieldRenderers';

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
      children: (field: unknown) => JSXElement;
    }) => JSXElement;
    AppForm: (props: { children: JSXElement }) => JSXElement;
    Form: (props: { class?: string; children: JSXElement }) => JSXElement;
    AutoSubmit: (props: Record<string, never>) => JSXElement;
  };
  identifierCollection: ReturnType<typeof createIdentifierCollection>;
  testDisabled: () => boolean[];
  onTestThruster: (index: number) => void;
  onApplyPreset: (presetRows: Partial<ThrusterPresetRow>) => void;
  onResetAllocation: () => void;
};

const renderCalibrationLayout = (args: RenderCalibrationLayoutArgs): JSXElement => {
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

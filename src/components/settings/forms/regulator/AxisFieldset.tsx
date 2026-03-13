/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import type { Component } from 'solid-js';

import { FieldLegend, Fieldset } from '@manafishrov/ui/field';

import type { RegulatorSuggestions } from '@/stores/rovConfig';

import * as m from '@/paraglide/messages';

import { MAX_PID_VALUE, MAX_TURN_RATE } from './constants';
import { FieldSuggestionActions } from './FieldSuggestionActions';

type AxisFieldProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppField: any;
  name: string;
  label: string;
  defaultValue: number;
  suggestionValue?: number | null | undefined;
  title: string;
};

const AxisNumberField: Component<AxisFieldProps> = ({
  AppField,
  name,
  label,
  defaultValue,
  suggestionValue,
  title,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const Field = AppField;
  return (
    <Field name={name}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(field: any) => (
        <field.NumberInputField
          label={label}
          min={0}
          max={MAX_PID_VALUE}
          step={1}
          trailingAddon={
            <FieldSuggestionActions
              defaultValue={defaultValue}
              suggestionValue={suggestionValue}
              onChange={field().handleChange}
              label={`${title} ${label}`}
            />
          }
        />
      )}
    </Field>
  );
};

type AxisSliderFieldProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppField: any;
  name: string;
};

const AxisSliderField: Component<AxisSliderFieldProps> = ({ AppField, name }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const Field = AppField;
  return (
    <Field name={name}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(field: any) => (
        <field.SliderField
          class='[&_[data-scope=slider][data-part=value-text]::after]:content-["°/s"]'
          label={m.regulator_pid_turn_speed_label()}
          description={m.regulator_pid_turn_speed_description()}
          min={0}
          max={MAX_TURN_RATE}
          step={1}
        />
      )}
    </Field>
  );
};

type AxisFieldsetProps = {
  title: string;
  description: string;
  axisName: 'pitch' | 'yaw' | 'roll' | 'depth';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppField: any;
  suggestions?: RegulatorSuggestions | null | undefined;
  defaultKp: number;
  defaultKi: number;
  defaultKd: number;
};

// eslint-disable-next-line max-lines-per-function
export const AxisFieldset: Component<AxisFieldsetProps> = ({
  title,
  description,
  axisName,
  AppField,
  suggestions,
  defaultKp,
  defaultKi,
  defaultKd,
}) => {
  // eslint-disable-next-line init-declarations
  let kpSuggestion: number | undefined;
  // eslint-disable-next-line init-declarations
  let kiSuggestion: number | undefined;
  // eslint-disable-next-line init-declarations
  let kdSuggestion: number | undefined;

  if (suggestions) {
    kpSuggestion = suggestions[axisName].kp;
    kiSuggestion = suggestions[axisName].ki;
    kdSuggestion = suggestions[axisName].kd;
  }

  return (
    <Fieldset>
      <FieldLegend>{title}</FieldLegend>
      <p class='text-muted-foreground mb-4 text-sm'>{description}</p>
      <div class='space-y-4'>
        <AxisNumberField
          AppField={AppField}
          name={`${axisName}.kp`}
          label={m.regulator_pid_kp()}
          defaultValue={defaultKp}
          suggestionValue={kpSuggestion}
          title={title}
        />
        <AxisNumberField
          AppField={AppField}
          name={`${axisName}.ki`}
          label={m.regulator_pid_ki()}
          defaultValue={defaultKi}
          suggestionValue={kiSuggestion}
          title={title}
        />
        <AxisNumberField
          AppField={AppField}
          name={`${axisName}.kd`}
          label={m.regulator_pid_kd()}
          defaultValue={defaultKd}
          suggestionValue={kdSuggestion}
          title={title}
        />
        <AxisSliderField AppField={AppField} name={`${axisName}.rate`} />
      </div>
    </Fieldset>
  );
};

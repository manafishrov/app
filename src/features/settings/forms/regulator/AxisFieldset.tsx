import { FieldLegend, Fieldset } from '@manafishrov/ui/field';
import { withForm } from '@manafishrov/ui/form';

import type { RegulatorSuggestions } from '@/stores/rovConfig';

import * as m from '@/paraglide/messages';

import { MAX_PID_VALUE, MAX_TURN_RATE } from './constants';
import { FieldSuggestionActions } from './FieldSuggestionActions';
import { REGULATOR_FORM_DEFAULT_VALUES } from './schema';

type AxisName = 'pitch' | 'yaw' | 'roll' | 'depth';
type AxisNumberKey = 'kp' | 'ki' | 'kd';
type AxisSuggestionValues = Pick<RegulatorSuggestions[AxisName], AxisNumberKey>;

type AxisNumberFieldProps = {
  axisName: AxisName;
  fieldName: AxisNumberKey;
  label: string;
  title: string;
  defaultValue: number;
  suggestionValue: number | undefined;
};

type AxisRateFieldProps = {
  axisName: AxisName;
};

type AxisFieldsetProps = {
  title: string;
  description: string;
  axisName: AxisName;
  suggestions: RegulatorSuggestions;
  hasSuggestions: boolean;
  defaultKp: number;
  defaultKi: number;
  defaultKd: number;
};

const EMPTY_AXIS_CONFIG = { kp: 0, ki: 0, kd: 0, rate: 0 };

export const EMPTY_REGULATOR_SUGGESTIONS: RegulatorSuggestions = {
  pitch: EMPTY_AXIS_CONFIG,
  yaw: EMPTY_AXIS_CONFIG,
  roll: EMPTY_AXIS_CONFIG,
  depth: EMPTY_AXIS_CONFIG,
};

const getAxisSuggestions = (
  suggestions: RegulatorSuggestions,
  axisName: AxisName,
): AxisSuggestionValues => suggestions[axisName];

const getSuggestionValue = (hasSuggestions: boolean, value: number): number | undefined => {
  if (hasSuggestions) {
    return value;
  }

  return;
};

const AXIS_NUMBER_FIELD_DEFAULT_PROPS: AxisNumberFieldProps = {
  axisName: 'pitch',
  fieldName: 'kp',
  label: '',
  title: '',
  defaultValue: 0,
  suggestionValue: 0,
};

const AXIS_RATE_FIELD_DEFAULT_PROPS: AxisRateFieldProps = {
  axisName: 'pitch',
};

const AXIS_FIELDSET_DEFAULT_PROPS: AxisFieldsetProps = {
  title: '',
  description: '',
  axisName: 'pitch',
  suggestions: EMPTY_REGULATOR_SUGGESTIONS,
  hasSuggestions: false,
  defaultKp: 0,
  defaultKi: 0,
  defaultKd: 0,
};

const AxisNumberField = withForm({
  defaultValues: REGULATOR_FORM_DEFAULT_VALUES,
  props: AXIS_NUMBER_FIELD_DEFAULT_PROPS,
  render: (props) => (
    <props.form.AppField name={`${props.axisName}.${props.fieldName}`}>
      {(field) => (
        <field.NumberInputField
          label={props.label}
          min={0}
          max={MAX_PID_VALUE}
          step={1}
          trailingAddon={
            <FieldSuggestionActions
              defaultValue={props.defaultValue}
              suggestionValue={props.suggestionValue}
              onChange={field().handleChange}
              label={`${props.title} ${props.label}`}
            />
          }
        />
      )}
    </props.form.AppField>
  ),
});

const AxisRateField = withForm({
  defaultValues: REGULATOR_FORM_DEFAULT_VALUES,
  props: AXIS_RATE_FIELD_DEFAULT_PROPS,
  render: (props) => (
    <props.form.AppField name={`${props.axisName}.rate`}>
      {(field) => (
        <field.SliderField
          class='[&_[data-scope=slider][data-part=value-text]::after]:content-["°/s"]'
          label={m.regulator_pid_turn_speed_label()}
          description={m.regulator_pid_turn_speed_description()}
          min={0}
          max={MAX_TURN_RATE}
          step={1}
        />
      )}
    </props.form.AppField>
  ),
});

export const AxisFieldset = withForm({
  defaultValues: REGULATOR_FORM_DEFAULT_VALUES,
  props: AXIS_FIELDSET_DEFAULT_PROPS,
  render: (props) => {
    const suggestions = getAxisSuggestions(props.suggestions, props.axisName);

    return (
      <Fieldset>
        <FieldLegend>{props.title}</FieldLegend>
        <p class='text-muted-foreground mb-4 text-sm'>{props.description}</p>
        <div class='space-y-4'>
          <AxisNumberField
            form={props.form}
            axisName={props.axisName}
            fieldName='kp'
            label={m.regulator_pid_kp()}
            title={props.title}
            defaultValue={props.defaultKp}
            suggestionValue={getSuggestionValue(props.hasSuggestions, suggestions.kp)}
          />
          <AxisNumberField
            form={props.form}
            axisName={props.axisName}
            fieldName='ki'
            label={m.regulator_pid_ki()}
            title={props.title}
            defaultValue={props.defaultKi}
            suggestionValue={getSuggestionValue(props.hasSuggestions, suggestions.ki)}
          />
          <AxisNumberField
            form={props.form}
            axisName={props.axisName}
            fieldName='kd'
            label={m.regulator_pid_kd()}
            title={props.title}
            defaultValue={props.defaultKd}
            suggestionValue={getSuggestionValue(props.hasSuggestions, suggestions.kd)}
          />
          <AxisRateField form={props.form} axisName={props.axisName} />
        </div>
      </Fieldset>
    );
  },
});

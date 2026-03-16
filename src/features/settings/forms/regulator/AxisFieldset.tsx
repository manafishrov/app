import type { ComponentProps, JSX } from 'solid-js';

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
  suggestionValue?: number;
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

type AxisNumberFieldConfig = {
  fieldName: AxisNumberKey;
  label: string;
  defaultValue: number;
  suggestionValue: number | undefined;
};

const EMPTY_AXIS_CONFIG = { kp: 0, ki: 0, kd: 0, rate: 0 };

export const EMPTY_REGULATOR_SUGGESTIONS: RegulatorSuggestions = {
  pitch: EMPTY_AXIS_CONFIG,
  yaw: EMPTY_AXIS_CONFIG,
  roll: EMPTY_AXIS_CONFIG,
  depth: EMPTY_AXIS_CONFIG,
};

export const hasRegulatorSuggestions = (suggestions: RegulatorSuggestions | undefined): boolean => {
  if (!suggestions) {
    return false;
  }

  return Object.values(suggestions).some(
    (axis) => axis.kp !== 0 || axis.ki !== 0 || axis.kd !== 0 || axis.rate !== 0,
  );
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
            typeof props.suggestionValue === 'number' && (
              <FieldSuggestionActions
                defaultValue={props.defaultValue}
                suggestionValue={props.suggestionValue}
                onChange={field().handleChange}
                label={`${props.title} ${props.label}`}
              />
            )
          }
        />
      )}
    </props.form.AppField>
  ),
});

const renderAxisNumberField = (
  props: Pick<ComponentProps<typeof AxisNumberField>, 'form'> &
    Pick<AxisFieldsetProps, 'axisName' | 'title'>,
  config: AxisNumberFieldConfig,
): JSX.Element => {
  if (typeof config.suggestionValue === 'number') {
    return (
      <AxisNumberField
        form={props.form}
        axisName={props.axisName}
        fieldName={config.fieldName}
        label={config.label}
        title={props.title}
        defaultValue={config.defaultValue}
        suggestionValue={config.suggestionValue}
      />
    );
  }

  return (
    <AxisNumberField
      form={props.form}
      axisName={props.axisName}
      fieldName={config.fieldName}
      label={config.label}
      title={props.title}
      defaultValue={config.defaultValue}
    />
  );
};

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
    const kpSuggestionValue = getSuggestionValue(props.hasSuggestions, suggestions.kp);
    const kiSuggestionValue = getSuggestionValue(props.hasSuggestions, suggestions.ki);
    const kdSuggestionValue = getSuggestionValue(props.hasSuggestions, suggestions.kd);

    return (
      <Fieldset>
        <FieldLegend>{props.title}</FieldLegend>
        <p class='text-muted-foreground mb-4 text-sm'>{props.description}</p>
        <div class='space-y-4'>
          {renderAxisNumberField(props, {
            fieldName: 'kp',
            label: m.regulator_pid_kp(),
            defaultValue: props.defaultKp,
            suggestionValue: kpSuggestionValue,
          })}
          {renderAxisNumberField(props, {
            fieldName: 'ki',
            label: m.regulator_pid_ki(),
            defaultValue: props.defaultKi,
            suggestionValue: kiSuggestionValue,
          })}
          {renderAxisNumberField(props, {
            fieldName: 'kd',
            label: m.regulator_pid_kd(),
            defaultValue: props.defaultKd,
            suggestionValue: kdSuggestionValue,
          })}
          <AxisRateField form={props.form} axisName={props.axisName} />
        </div>
      </Fieldset>
    );
  },
});

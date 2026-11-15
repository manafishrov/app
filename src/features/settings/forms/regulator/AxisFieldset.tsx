import type { ComponentProps, JSX } from 'solid-js';

import { FieldLegend, Fieldset } from '@manafishrov/ui/field';
import { withForm } from '@manafishrov/ui/form';

import * as m from '@/paraglide/messages';

import { DEPTH_RATE_STEP, MAX_DEPTH_RATE, MAX_PID_VALUE, MAX_TURN_RATE } from './constants';
import { FieldResetButton } from './FieldResetButton';
import { REGULATOR_FORM_DEFAULT_VALUES } from './schema';

type AxisName = 'pitch' | 'yaw' | 'roll' | 'depth';
type AxisNumberKey = 'kp' | 'ki' | 'kd';

type AxisNumberFieldProps = {
  axisName: AxisName;
  fieldName: AxisNumberKey;
  label: string;
  title: string;
  defaultValue: number;
};

type AxisRateFieldProps = {
  axisName: AxisName;
};

type AxisFieldsetProps = {
  title: string;
  description: string;
  axisName: AxisName;
  defaultKp: number;
  defaultKi: number;
  defaultKd: number;
};

type AxisNumberFieldConfig = {
  fieldName: AxisNumberKey;
  label: string;
  defaultValue: number;
};

const AXIS_NUMBER_FIELD_DEFAULT_PROPS: AxisNumberFieldProps = {
  axisName: 'pitch',
  fieldName: 'kp',
  label: '',
  title: '',
  defaultValue: 0,
};

const AXIS_RATE_CONFIG: Record<
  AxisName,
  { label: () => string; description: () => string; max: number; unit: string }
> = {
  pitch: {
    label: m.regulator_pid_pitch_rate_label,
    description: m.regulator_pid_pitch_rate_description,
    max: MAX_TURN_RATE,
    unit: '°/s',
  },
  roll: {
    label: m.regulator_pid_roll_rate_label,
    description: m.regulator_pid_roll_rate_description,
    max: MAX_TURN_RATE,
    unit: '°/s',
  },
  yaw: {
    label: m.regulator_pid_yaw_rate_label,
    description: m.regulator_pid_yaw_rate_description,
    max: MAX_TURN_RATE,
    unit: '°/s',
  },
  depth: {
    label: m.regulator_pid_depth_rate_label,
    description: m.regulator_pid_depth_rate_description,
    max: MAX_DEPTH_RATE,
    unit: 'm/s',
  },
};

const AXIS_RATE_FIELD_DEFAULT_PROPS: AxisRateFieldProps = {
  axisName: 'pitch',
};

const AXIS_FIELDSET_DEFAULT_PROPS: AxisFieldsetProps = {
  title: '',
  description: '',
  axisName: 'pitch',
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
            <FieldResetButton
              defaultValue={props.defaultValue}
              onChange={field().handleChange}
              label={`${props.title} ${props.label}`}
            />
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
): JSX.Element => (
  <AxisNumberField
    form={props.form}
    axisName={props.axisName}
    fieldName={config.fieldName}
    label={config.label}
    title={props.title}
    defaultValue={config.defaultValue}
  />
);

const AxisRateField = withForm({
  defaultValues: REGULATOR_FORM_DEFAULT_VALUES,
  props: AXIS_RATE_FIELD_DEFAULT_PROPS,
  render: (props) => {
    const config = AXIS_RATE_CONFIG[props.axisName];
    return (
      <props.form.AppField name={`${props.axisName}.rate`}>
        {(field) => (
          <field.SliderField
            class={`[&_[data-scope=slider][data-part=value-text]::after]:content-["${config.unit}"]`}
            label={config.label()}
            description={config.description()}
            min={0}
            max={config.max}
            step={props.axisName === 'depth' ? DEPTH_RATE_STEP : 1}
          />
        )}
      </props.form.AppField>
    );
  },
});

export const AxisFieldset = withForm({
  defaultValues: REGULATOR_FORM_DEFAULT_VALUES,
  props: AXIS_FIELDSET_DEFAULT_PROPS,
  render: (props) => (
    <Fieldset>
      <FieldLegend>{props.title}</FieldLegend>
      <p class='mb-4 text-sm text-muted-foreground'>{props.description}</p>
      <div class='space-y-4'>
        {renderAxisNumberField(props, {
          fieldName: 'kp',
          label: m.regulator_pid_kp(),
          defaultValue: props.defaultKp,
        })}
        {renderAxisNumberField(props, {
          fieldName: 'ki',
          label: m.regulator_pid_ki(),
          defaultValue: props.defaultKi,
        })}
        {renderAxisNumberField(props, {
          fieldName: 'kd',
          label: m.regulator_pid_kd(),
          defaultValue: props.defaultKd,
        })}
        <AxisRateField form={props.form} axisName={props.axisName} />
      </div>
    </Fieldset>
  ),
});

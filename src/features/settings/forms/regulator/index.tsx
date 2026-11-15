import type { Component, ComponentProps } from 'solid-js';

import { useAppForm } from '@manafishrov/ui/form';

import * as m from '@/paraglide/messages';
import {
  type AxisConfig,
  type DirectionCoefficients,
  type Regulator as RegulatorType,
  rovConfigStore,
} from '@/stores/rovConfig';
import { setRovConfig } from '@/tauri';

import { saveRovConfigForm } from '../rovConfigForm';
import { AxisFieldset } from './AxisFieldset';
import { DirectionCoefficientsFieldset } from './DirectionCoefficientsFieldset';
import { createFormSchema, type FormValues } from './schema';

const toAxisConfig = (axis: FormValues['pitch'], fallbackRate: number): AxisConfig => ({
  kp: axis.kp,
  ki: axis.ki,
  kd: axis.kd,
  rate: axis.rate[0] ?? fallbackRate,
});

const getFormDefaultValues = (): FormValues => ({
  pitch: {
    kp: rovConfigStore.regulator.pitch.kp,
    ki: rovConfigStore.regulator.pitch.ki,
    kd: rovConfigStore.regulator.pitch.kd,
    rate: [rovConfigStore.regulator.pitch.rate],
  },
  yaw: {
    kp: rovConfigStore.regulator.yaw.kp,
    ki: rovConfigStore.regulator.yaw.ki,
    kd: rovConfigStore.regulator.yaw.kd,
    rate: [rovConfigStore.regulator.yaw.rate],
  },
  roll: {
    kp: rovConfigStore.regulator.roll.kp,
    ki: rovConfigStore.regulator.roll.ki,
    kd: rovConfigStore.regulator.roll.kd,
    rate: [rovConfigStore.regulator.roll.rate],
  },
  depth: {
    kp: rovConfigStore.regulator.depth.kp,
    ki: rovConfigStore.regulator.depth.ki,
    kd: rovConfigStore.regulator.depth.kd,
    rate: [rovConfigStore.regulator.depth.rate],
  },
  fpvMode: rovConfigStore.regulator.fpvMode,
  surge: rovConfigStore.directionCoefficients.surge,
  heave: rovConfigStore.directionCoefficients.heave,
  sway: rovConfigStore.directionCoefficients.sway,
});

const submitRegulatorConfig = (value: FormValues): Promise<void> => {
  const regulator: RegulatorType = {
    pitch: toAxisConfig(value.pitch, rovConfigStore.regulator.pitch.rate),
    yaw: toAxisConfig(value.yaw, rovConfigStore.regulator.yaw.rate),
    roll: toAxisConfig(value.roll, rovConfigStore.regulator.roll.rate),
    depth: toAxisConfig(value.depth, rovConfigStore.regulator.depth.rate),
    fpvMode: value.fpvMode,
  };

  const directionCoefficients: DirectionCoefficients = {
    surge: value.surge,
    heave: value.heave,
    sway: value.sway,
  };

  return setRovConfig({ regulator, directionCoefficients });
};

type AxisFieldsetsProps = {
  form: ComponentProps<typeof AxisFieldset>['form'];
};

const AxisFieldsets: Component<AxisFieldsetsProps> = (props) => (
  <>
    <AxisFieldset
      form={props.form}
      title={m.regulator_pid_pitch_title()}
      description={m.regulator_pid_pitch_description()}
      axisName='pitch'
      defaultKp={3}
      defaultKi={2}
      defaultKd={0.5}
    />
    <AxisFieldset
      form={props.form}
      title={m.regulator_direction_coefficients_yaw()}
      description={m.regulator_pid_yaw_description()}
      axisName='yaw'
      defaultKp={3}
      defaultKi={2}
      defaultKd={0.5}
    />
    <AxisFieldset
      form={props.form}
      title={m.regulator_pid_roll_title()}
      description={m.regulator_pid_roll_description()}
      axisName='roll'
      defaultKp={3}
      defaultKi={2}
      defaultKd={0.5}
    />
    <AxisFieldset
      form={props.form}
      title={m.regulator_pid_depth_title()}
      description={m.regulator_pid_depth_description()}
      axisName='depth'
      defaultKp={2}
      defaultKi={0.5}
      defaultKd={0.1}
    />
  </>
);

export const Regulator: Component = () => {
  const formSchema = createFormSchema();
  const form = useAppForm(() => ({
    validators: {
      onChange: formSchema,
      onSubmit: formSchema,
    },
    defaultValues: getFormDefaultValues(),
    onSubmit: ({ value }: { value: FormValues }): Promise<void> =>
      saveRovConfigForm(form, value, {
        save: submitRegulatorConfig,
        readStored: getFormDefaultValues,
      }),
  }));

  return (
    <form.AppForm>
      <form.Form>
        <form.AppField name='fpvMode'>
          {(field) => (
            <field.SwitchField
              label={m.regulator_fpv_mode_title()}
              description={m.regulator_fpv_mode_description()}
            />
          )}
        </form.AppField>

        <AxisFieldsets form={form} />

        <DirectionCoefficientsFieldset form={form} />

        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};

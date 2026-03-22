import type { Component, ComponentProps } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { useAppForm } from '@manafishrov/ui/form';

import * as m from '@/paraglide/messages';
import {
  type AxisConfig,
  type DirectionCoefficients,
  type Regulator as RegulatorType,
  rovConfigStore,
} from '@/stores/rovConfig';
import { regulatorSuggestions, setRovConfig, startRegulatorAutoTuning } from '@/tauri';

import { AxisFieldset, EMPTY_REGULATOR_SUGGESTIONS, hasRegulatorSuggestions } from './AxisFieldset';
import { AUTO_TUNING_TIMEOUT_MS } from './constants';
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
  surge: rovConfigStore.directionCoefficients.surge,
  heave: rovConfigStore.directionCoefficients.heave,
  sway: rovConfigStore.directionCoefficients.sway,
});

const handleFormSubmit = ({ value }: { value: FormValues }): Promise<void> => {
  const regulator: RegulatorType = {
    pitch: toAxisConfig(value.pitch, rovConfigStore.regulator.pitch.rate),
    yaw: toAxisConfig(value.yaw, rovConfigStore.regulator.yaw.rate),
    roll: toAxisConfig(value.roll, rovConfigStore.regulator.roll.rate),
    depth: toAxisConfig(value.depth, rovConfigStore.regulator.depth.rate),
    fpvMode: rovConfigStore.regulator.fpvMode,
  };

  const directionCoefficients: DirectionCoefficients = {
    surge: value.surge,
    heave: value.heave,
    sway: value.sway,
  };

  return setRovConfig({
    regulator,
    directionCoefficients,
  });
};

type AxisFieldsetsProps = {
  form: ComponentProps<typeof AxisFieldset>['form'];
  suggestions: ComponentProps<typeof AxisFieldset>['suggestions'];
  hasSuggestions: ComponentProps<typeof AxisFieldset>['hasSuggestions'];
};

const AxisFieldsets: Component<AxisFieldsetsProps> = (props) => (
  <>
    <AxisFieldset
      form={props.form}
      title={m.regulator_pid_pitch_title()}
      description={m.regulator_pid_pitch_description()}
      axisName='pitch'
      suggestions={props.suggestions}
      hasSuggestions={props.hasSuggestions}
      defaultKp={5}
      defaultKi={0.5}
      defaultKd={1}
    />
    <AxisFieldset
      form={props.form}
      title={m.regulator_direction_coefficients_yaw()}
      description={m.regulator_pid_yaw_description()}
      axisName='yaw'
      suggestions={props.suggestions}
      hasSuggestions={props.hasSuggestions}
      defaultKp={1.5}
      defaultKi={0.1}
      defaultKd={0.4}
    />
    <AxisFieldset
      form={props.form}
      title={m.regulator_pid_roll_title()}
      description={m.regulator_pid_roll_description()}
      axisName='roll'
      suggestions={props.suggestions}
      hasSuggestions={props.hasSuggestions}
      defaultKp={1.5}
      defaultKi={0.1}
      defaultKd={0.4}
    />
    <AxisFieldset
      form={props.form}
      title={m.regulator_pid_depth_title()}
      description={m.regulator_pid_depth_description()}
      axisName='depth'
      suggestions={props.suggestions}
      hasSuggestions={props.hasSuggestions}
      defaultKp={0}
      defaultKi={0.05}
      defaultKd={0.1}
    />
  </>
);

export const Regulator: Component = () => {
  // HACK: Set signal to false when we want to make auto tuning possible to trigger
  const [autoTuningDisabled, setAutoTuningDisabled] = createSignal(true);
  const formSchema = createFormSchema();
  const rawSuggestions = regulatorSuggestions();
  const suggestions = rawSuggestions ?? EMPTY_REGULATOR_SUGGESTIONS;
  const hasSuggestions = hasRegulatorSuggestions(rawSuggestions);

  const form = useAppForm(() => ({
    validators: {
      onChange: formSchema,
      onSubmit: formSchema,
    },
    defaultValues: getFormDefaultValues(),
    onSubmit: handleFormSubmit,
  }));

  const handleAutoTuning = (): void => {
    setAutoTuningDisabled(true);
    startRegulatorAutoTuning()
      .then(() => {
        setTimeout(() => setAutoTuningDisabled(false), AUTO_TUNING_TIMEOUT_MS);
      })
      .catch(() => {
        setTimeout(() => setAutoTuningDisabled(false), AUTO_TUNING_TIMEOUT_MS);
      });
  };

  return (
    <form.AppForm>
      <form.Form>
        <AxisFieldsets form={form} suggestions={suggestions} hasSuggestions={hasSuggestions} />

        <div class='mt-6 flex items-center gap-4'>
          <Button variant='outline' onClick={handleAutoTuning} disabled={autoTuningDisabled()}>
            {m.regulator_pid_run_auto_tuning()}
          </Button>
        </div>

        <DirectionCoefficientsFieldset form={form} hasSuggestions={hasSuggestions} />

        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};

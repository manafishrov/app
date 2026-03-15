import type { Component } from 'solid-js';

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

import { AUTO_TUNING_TIMEOUT_MS } from './constants';
import { DepthFieldset } from './DepthFieldset';
import { DirectionCoefficientsFieldset } from './DirectionCoefficientsFieldset';
import { PitchFieldset } from './PitchFieldset';
import { RollFieldset } from './RollFieldset';
import { createFormSchema, type FormValues } from './schema';
import { YawFieldset } from './YawFieldset';

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

export const Regulator: Component = () => {
  const [autoTuningDisabled, setAutoTuningDisabled] = createSignal(false);
  const formSchema = createFormSchema();

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
        <PitchFieldset AppField={form.AppField} suggestions={regulatorSuggestions()} />
        <YawFieldset AppField={form.AppField} suggestions={regulatorSuggestions()} />
        <RollFieldset AppField={form.AppField} suggestions={regulatorSuggestions()} />
        <DepthFieldset AppField={form.AppField} suggestions={regulatorSuggestions()} />

        <div class='mt-6 flex items-center gap-4'>
          <Button variant='outline' onClick={handleAutoTuning} disabled={autoTuningDisabled()}>
            {m.regulator_pid_run_auto_tuning()}
          </Button>
        </div>

        <DirectionCoefficientsFieldset AppField={form.AppField} />

        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};

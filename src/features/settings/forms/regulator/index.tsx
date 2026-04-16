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
import { REGULATOR_FORM_DEFAULT_VALUES, createFormSchema, type FormValues } from './schema';

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
type RegulatorFieldPath =
  | 'pitch.kp'
  | 'pitch.ki'
  | 'pitch.kd'
  | 'pitch.rate'
  | 'yaw.kp'
  | 'yaw.ki'
  | 'yaw.kd'
  | 'yaw.rate'
  | 'roll.kp'
  | 'roll.ki'
  | 'roll.kd'
  | 'roll.rate'
  | 'depth.kp'
  | 'depth.ki'
  | 'depth.kd'
  | 'depth.rate'
  | 'surge'
  | 'heave'
  | 'sway';

type RegulatorFieldValue = number | number[];

type RegulatorFormController = {
  reset: (values: FormValues) => void;
  setFieldValue: (field: RegulatorFieldPath, value: RegulatorFieldValue) => void;
};
const REGULATOR_RESET_FIELDS: readonly [RegulatorFieldPath, RegulatorFieldValue][] = [
  ['pitch.kp', REGULATOR_FORM_DEFAULT_VALUES.pitch.kp],
  ['pitch.ki', REGULATOR_FORM_DEFAULT_VALUES.pitch.ki],
  ['pitch.kd', REGULATOR_FORM_DEFAULT_VALUES.pitch.kd],
  ['pitch.rate', REGULATOR_FORM_DEFAULT_VALUES.pitch.rate],
  ['yaw.kp', REGULATOR_FORM_DEFAULT_VALUES.yaw.kp],
  ['yaw.ki', REGULATOR_FORM_DEFAULT_VALUES.yaw.ki],
  ['yaw.kd', REGULATOR_FORM_DEFAULT_VALUES.yaw.kd],
  ['yaw.rate', REGULATOR_FORM_DEFAULT_VALUES.yaw.rate],
  ['roll.kp', REGULATOR_FORM_DEFAULT_VALUES.roll.kp],
  ['roll.ki', REGULATOR_FORM_DEFAULT_VALUES.roll.ki],
  ['roll.kd', REGULATOR_FORM_DEFAULT_VALUES.roll.kd],
  ['roll.rate', REGULATOR_FORM_DEFAULT_VALUES.roll.rate],
  ['depth.kp', REGULATOR_FORM_DEFAULT_VALUES.depth.kp],
  ['depth.ki', REGULATOR_FORM_DEFAULT_VALUES.depth.ki],
  ['depth.kd', REGULATOR_FORM_DEFAULT_VALUES.depth.kd],
  ['depth.rate', REGULATOR_FORM_DEFAULT_VALUES.depth.rate],
  ['surge', REGULATOR_FORM_DEFAULT_VALUES.surge],
  ['heave', REGULATOR_FORM_DEFAULT_VALUES.heave],
  ['sway', REGULATOR_FORM_DEFAULT_VALUES.sway],
];
const syncRegulatorFormWithStore = (
  form: RegulatorFormController,
  isDirty: () => boolean,
): void => {
  createEffect(
    on(
      () => [
        rovConfigStore.regulator.pitch.kp,
        rovConfigStore.regulator.pitch.ki,
        rovConfigStore.regulator.pitch.kd,
        rovConfigStore.regulator.pitch.rate,
        rovConfigStore.regulator.yaw.kp,
        rovConfigStore.regulator.yaw.ki,
        rovConfigStore.regulator.yaw.kd,
        rovConfigStore.regulator.yaw.rate,
        rovConfigStore.regulator.roll.kp,
        rovConfigStore.regulator.roll.ki,
        rovConfigStore.regulator.roll.kd,
        rovConfigStore.regulator.roll.rate,
        rovConfigStore.regulator.depth.kp,
        rovConfigStore.regulator.depth.ki,
        rovConfigStore.regulator.depth.kd,
        rovConfigStore.regulator.depth.rate,
        rovConfigStore.directionCoefficients.surge,
        rovConfigStore.directionCoefficients.heave,
        rovConfigStore.directionCoefficients.sway,
      ],
      () => {
        if (!isDirty()) {
          form.reset(getFormDefaultValues());
        }
      },
      { defer: true },
    ),
  );
};
const resetRegulatorForm = (form: RegulatorFormController): void => {
  for (const [field, value] of REGULATOR_RESET_FIELDS) {
    form.setFieldValue(field, value);
  }
};
const createAutoTuningHandler = (
  setAutoTuningDisabled: (value: boolean) => void,
): (() => void) =>
  (): void => {
    setAutoTuningDisabled(true);
    startRegulatorAutoTuning()
      .then(() => {
        setTimeout(() => {
          setAutoTuningDisabled(false);
        }, AUTO_TUNING_TIMEOUT_MS);
      })
      .catch(() => {
        setTimeout(() => {
          setAutoTuningDisabled(false);
        }, AUTO_TUNING_TIMEOUT_MS);
      });
  };
const RegulatorActions: Component<{
  autoTuningDisabled: boolean;
  onAutoTuning: () => void;
  onReset: () => void;
}> = (props) => (
  <div class='mt-6 flex items-center gap-4'>
    <Button variant='outline' onClick={props.onAutoTuning} disabled={props.autoTuningDisabled}>
      {m.regulator_pid_run_auto_tuning()}
    </Button>
    <Button variant='ghost' onClick={props.onReset}>
      {m.regulator_field_buttons_reset_to_default()}
    </Button>
  </div>
);
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
      defaultKp={3}
      defaultKi={2}
      defaultKd={0.5}
    />
    <AxisFieldset
      form={props.form}
      title={m.regulator_direction_coefficients_yaw()}
      description={m.regulator_pid_yaw_description()}
      axisName='yaw'
      suggestions={props.suggestions}
      hasSuggestions={props.hasSuggestions}
      defaultKp={3}
      defaultKi={2}
      defaultKd={0.5}
    />
    <AxisFieldset
      form={props.form}
      title={m.regulator_pid_roll_title()}
      description={m.regulator_pid_roll_description()}
      axisName='roll'
      suggestions={props.suggestions}
      hasSuggestions={props.hasSuggestions}
      defaultKp={3}
      defaultKi={2}
      defaultKd={0.5}
    />
    <AxisFieldset
      form={props.form}
      title={m.regulator_pid_depth_title()}
      description={m.regulator_pid_depth_description()}
      axisName='depth'
      suggestions={props.suggestions}
      hasSuggestions={props.hasSuggestions}
      defaultKp={2}
      defaultKi={0.5}
      defaultKd={0.1}
    />
  </>
);
export const Regulator: Component = () => {
  const [autoTuningDisabled, setAutoTuningDisabled] = createSignal(true);
  const formSchema = createFormSchema();
  const form = useAppForm(() => ({
    validators: {
      onChange: formSchema,
      onSubmit: formSchema,
    },
    defaultValues: getFormDefaultValues(),
    onSubmit: ({ value }: { value: FormValues }): Promise<void> =>
      handleFormSubmit({ value }).then(() => {
        form.reset(value);
      }),
  }));
  const isDirty = form.useStore((state) => state.isDirty);
  const handleAutoTuning = createAutoTuningHandler(setAutoTuningDisabled);

  syncRegulatorFormWithStore(form, isDirty);

  return (
    <form.AppForm>
      <form.Form>
        <AxisFieldsets
          form={form}
          suggestions={regulatorSuggestions() ?? EMPTY_REGULATOR_SUGGESTIONS}
          hasSuggestions={hasRegulatorSuggestions(regulatorSuggestions())}
        />

        <RegulatorActions
          autoTuningDisabled={autoTuningDisabled()}
          onAutoTuning={handleAutoTuning}
          onReset={() => {
            resetRegulatorForm(form);
          }}
        />

        <DirectionCoefficientsFieldset
          form={form}
          hasSuggestions={hasRegulatorSuggestions(regulatorSuggestions())}
        />

        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};

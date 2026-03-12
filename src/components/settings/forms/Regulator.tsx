import { Button } from '@manafishrov/ui/button';
import { FieldLegend, Fieldset } from '@manafishrov/ui/field';
import { useAppForm } from '@manafishrov/ui/form';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import { createSignal, type Component } from 'solid-js';
import { z } from 'zod';

import * as m from '@/paraglide/messages';
import {
  type AxisConfig,
  type DirectionCoefficients,
  type Regulator as RegulatorType,
  rovConfigStore,
} from '@/stores/rovConfig';
import { regulatorSuggestions, setRovConfig, startRegulatorAutoTuning } from '@/tauri';

const createAxisSchema = () =>
  z.object({
    kp: z
      .number()
      .min(0, m.validation_must_be_at_least_0())
      .max(100, m.validation_must_be_at_most_100()),
    ki: z
      .number()
      .min(0, m.validation_must_be_at_least_0())
      .max(100, m.validation_must_be_at_most_100()),
    kd: z
      .number()
      .min(0, m.validation_must_be_at_least_0())
      .max(100, m.validation_must_be_at_most_100()),
    rate: z
      .array(z.number().max(360, m.validation_must_be_at_most_360()))
      .length(1)
      .refine(([rate]) => rate === undefined || rate >= 5, {
        message: m.validation_turn_rate_at_least_5(),
      }),
  });

const createFormSchema = () => {
  const axisSchema = createAxisSchema();

  return z.object({
    pitch: axisSchema,
    yaw: axisSchema,
    roll: axisSchema,
    depth: axisSchema,
    surge: z
      .number()
      .min(0, m.validation_must_be_at_least_0())
      .max(100, m.validation_must_be_at_most_100()),
    heave: z
      .number()
      .min(0, m.validation_must_be_at_least_0())
      .max(100, m.validation_must_be_at_most_100()),
    sway: z
      .number()
      .min(0, m.validation_must_be_at_least_0())
      .max(100, m.validation_must_be_at_most_100()),
  });
};

type FormValues = {
  pitch: Omit<AxisConfig, 'rate'> & { rate: number[] };
  yaw: Omit<AxisConfig, 'rate'> & { rate: number[] };
  roll: Omit<AxisConfig, 'rate'> & { rate: number[] };
  depth: Omit<AxisConfig, 'rate'> & { rate: number[] };
  surge: number;
  heave: number;
  sway: number;
};

type FieldSuggestionActionsProps = {
  defaultValue: number;
  suggestionValue?: number | undefined;
  onChange: (value: number) => void;
  label: string;
};

const FieldSuggestionActions: Component<FieldSuggestionActionsProps> = ({
  defaultValue,
  suggestionValue,
  onChange,
  label,
}) => (
  <div class='ml-4 flex gap-2'>
    <Tooltip>
      <TooltipTrigger
        asChild={(props) => (
          <Button
            {...props()}
            variant='ghost'
            aria-label={m.regulator_field_buttons_reset_to_default_for({ label })}
            onClick={() => onChange(defaultValue)}
          >
            {m.regulator_field_buttons_reset_to_default()}
          </Button>
        )}
      />
      <TooltipPositioner>
        <TooltipContent>
          <p>{m.regulator_field_buttons_reset_to_default_for({ label })}</p>
          <TooltipArrow />
        </TooltipContent>
      </TooltipPositioner>
    </Tooltip>
    {suggestionValue !== undefined && (
      <Tooltip>
        <TooltipTrigger
          asChild={(props) => (
            <Button
              {...props()}
              variant='outline'
              aria-label={m.regulator_field_buttons_use_suggestion_for({ label })}
              onClick={() => onChange(suggestionValue)}
            >
              {m.regulator_field_buttons_use_suggestion_with_value({ value: suggestionValue })}
            </Button>
          )}
        />
        <TooltipPositioner>
          <TooltipContent>
            <p>{m.regulator_field_buttons_use_suggestion_for({ label })}</p>
            <TooltipArrow />
          </TooltipContent>
        </TooltipPositioner>
      </Tooltip>
    )}
  </div>
);

export const Regulator: Component = () => {
  const [autoTuningDisabled, setAutoTuningDisabled] = createSignal(false);
  const formSchema = createFormSchema();

  const form = useAppForm(() => ({
    validators: {
      onChange: formSchema,
      onSubmit: formSchema,
    },
    defaultValues: {
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
    } satisfies FormValues,
    onSubmit: ({ value }) => {
      const toAxisConfig = (axis: FormValues['pitch'], fallbackRate: number): AxisConfig => ({
        kp: axis.kp,
        ki: axis.ki,
        kd: axis.kd,
        rate: axis.rate[0] ?? fallbackRate,
      });

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
    },
  }));

  const handleAutoTuning = async () => {
    setAutoTuningDisabled(true);
    await startRegulatorAutoTuning();
    setTimeout(() => setAutoTuningDisabled(false), 2000);
  };

  return (
    <form.AppForm>
      <form.Form>
        <Fieldset>
          <FieldLegend>{m.regulator_pid_pitch_title()}</FieldLegend>
          <p class='text-muted-foreground mb-4 text-sm'>{m.regulator_pid_pitch_description()}</p>
          <div class='space-y-4'>
            <form.AppField name='pitch.kp'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_pid_kp()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={5}
                      suggestionValue={
                        regulatorSuggestions() ? regulatorSuggestions()!.pitch.kp : undefined
                      }
                      onChange={field().handleChange}
                      label={`${m.regulator_pid_pitch_title()} ${m.regulator_pid_kp()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='pitch.ki'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_pid_ki()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={0.5}
                      suggestionValue={
                        regulatorSuggestions() ? regulatorSuggestions()!.pitch.ki : undefined
                      }
                      onChange={field().handleChange}
                      label={`${m.regulator_pid_pitch_title()} ${m.regulator_pid_ki()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='pitch.kd'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_pid_kd()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={1}
                      suggestionValue={
                        regulatorSuggestions() ? regulatorSuggestions()!.pitch.kd : undefined
                      }
                      onChange={field().handleChange}
                      label={`${m.regulator_pid_pitch_title()} ${m.regulator_pid_kd()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='pitch.rate'>
              {(field) => (
                <field.SliderField
                  class='[&_[data-scope=slider][data-part=value-text]::after]:content-["°/s"]'
                  label={m.regulator_pid_turn_speed_label()}
                  description={m.regulator_pid_turn_speed_description()}
                  min={0}
                  max={360}
                  step={1}
                />
              )}
            </form.AppField>
          </div>
        </Fieldset>

        <Fieldset>
          <FieldLegend>{m.regulator_direction_coefficients_yaw()}</FieldLegend>
          <p class='text-muted-foreground mb-4 text-sm'>{m.regulator_pid_yaw_description()}</p>
          <div class='space-y-4'>
            <form.AppField name='yaw.kp'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_pid_kp()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={1.5}
                      suggestionValue={
                        regulatorSuggestions() ? regulatorSuggestions()!.yaw.kp : undefined
                      }
                      onChange={field().handleChange}
                      label={`${m.regulator_direction_coefficients_yaw()} ${m.regulator_pid_kp()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='yaw.ki'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_pid_ki()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={0.1}
                      suggestionValue={
                        regulatorSuggestions() ? regulatorSuggestions()!.yaw.ki : undefined
                      }
                      onChange={field().handleChange}
                      label={`${m.regulator_direction_coefficients_yaw()} ${m.regulator_pid_ki()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='yaw.kd'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_pid_kd()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={0.4}
                      suggestionValue={
                        regulatorSuggestions() ? regulatorSuggestions()!.yaw.kd : undefined
                      }
                      onChange={field().handleChange}
                      label={`${m.regulator_direction_coefficients_yaw()} ${m.regulator_pid_kd()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='yaw.rate'>
              {(field) => (
                <field.SliderField
                  class='[&_[data-scope=slider][data-part=value-text]::after]:content-["°/s"]'
                  label={m.regulator_pid_turn_speed_label()}
                  description={m.regulator_pid_turn_speed_description()}
                  min={0}
                  max={360}
                  step={1}
                />
              )}
            </form.AppField>
          </div>
        </Fieldset>

        <Fieldset>
          <FieldLegend>{m.regulator_pid_roll_title()}</FieldLegend>
          <p class='text-muted-foreground mb-4 text-sm'>{m.regulator_pid_roll_description()}</p>
          <div class='space-y-4'>
            <form.AppField name='roll.kp'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_pid_kp()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={1.5}
                      suggestionValue={
                        regulatorSuggestions() ? regulatorSuggestions()!.roll.kp : undefined
                      }
                      onChange={field().handleChange}
                      label={`${m.regulator_pid_roll_title()} ${m.regulator_pid_kp()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='roll.ki'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_pid_ki()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={0.1}
                      suggestionValue={
                        regulatorSuggestions() ? regulatorSuggestions()!.roll.ki : undefined
                      }
                      onChange={field().handleChange}
                      label={`${m.regulator_pid_roll_title()} ${m.regulator_pid_ki()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='roll.kd'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_pid_kd()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={0.4}
                      suggestionValue={
                        regulatorSuggestions() ? regulatorSuggestions()!.roll.kd : undefined
                      }
                      onChange={field().handleChange}
                      label={`${m.regulator_pid_roll_title()} ${m.regulator_pid_kd()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='roll.rate'>
              {(field) => (
                <field.SliderField
                  class='[&_[data-scope=slider][data-part=value-text]::after]:content-["°/s"]'
                  label={m.regulator_pid_turn_speed_label()}
                  description={m.regulator_pid_turn_speed_description()}
                  min={0}
                  max={360}
                  step={1}
                />
              )}
            </form.AppField>
          </div>
        </Fieldset>

        <Fieldset>
          <FieldLegend>{m.regulator_pid_depth_title()}</FieldLegend>
          <p class='text-muted-foreground mb-4 text-sm'>{m.regulator_pid_depth_description()}</p>
          <div class='space-y-4'>
            <form.AppField name='depth.kp'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_pid_kp()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={0}
                      suggestionValue={
                        regulatorSuggestions() ? regulatorSuggestions()!.depth.kp : undefined
                      }
                      onChange={field().handleChange}
                      label={`${m.regulator_pid_depth_title()} ${m.regulator_pid_kp()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='depth.ki'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_pid_ki()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={0.05}
                      suggestionValue={
                        regulatorSuggestions() ? regulatorSuggestions()!.depth.ki : undefined
                      }
                      onChange={field().handleChange}
                      label={`${m.regulator_pid_depth_title()} ${m.regulator_pid_ki()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='depth.kd'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_pid_kd()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={0.1}
                      suggestionValue={
                        regulatorSuggestions() ? regulatorSuggestions()!.depth.kd : undefined
                      }
                      onChange={field().handleChange}
                      label={`${m.regulator_pid_depth_title()} ${m.regulator_pid_kd()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='depth.rate'>
              {(field) => (
                <field.SliderField
                  class='[&_[data-scope=slider][data-part=value-text]::after]:content-["°/s"]'
                  label={m.regulator_pid_turn_speed_label()}
                  description={m.regulator_pid_turn_speed_description()}
                  min={0}
                  max={360}
                  step={1}
                />
              )}
            </form.AppField>
          </div>
        </Fieldset>

        <div class='mt-6 flex items-center gap-4'>
          <Button variant='outline' onClick={handleAutoTuning} disabled={autoTuningDisabled()}>
            {m.regulator_pid_run_auto_tuning()}
          </Button>
        </div>

        <Fieldset>
          <FieldLegend>{m.regulator_direction_coefficients_title()}</FieldLegend>
          <p class='text-muted-foreground mb-4 text-sm'>
            {m.regulator_direction_coefficients_description()}
          </p>
          <div class='space-y-4'>
            <form.AppField name='surge'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_direction_coefficients_surge()}
                  description={m.calibration_thruster_allocation_surge_tooltip()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={0.8}
                      onChange={field().handleChange}
                      label={`${m.regulator_direction_coefficients_surge()} ${m.regulator_direction_coefficients_title()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='heave'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_direction_coefficients_heave()}
                  description={m.calibration_thruster_allocation_heave_tooltip()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={0.5}
                      onChange={field().handleChange}
                      label={`${m.regulator_direction_coefficients_heave()} ${m.regulator_direction_coefficients_title()}`}
                    />
                  }
                />
              )}
            </form.AppField>
            <form.AppField name='sway'>
              {(field) => (
                <field.NumberInputField
                  label={m.regulator_direction_coefficients_sway()}
                  description={m.calibration_thruster_allocation_sway_tooltip()}
                  min={0}
                  max={100}
                  step={1}
                  trailingAddon={
                    <FieldSuggestionActions
                      defaultValue={0.35}
                      onChange={field().handleChange}
                      label={`${m.regulator_direction_coefficients_sway()} ${m.regulator_direction_coefficients_title()}`}
                    />
                  }
                />
              )}
            </form.AppField>
          </div>
        </Fieldset>
        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};

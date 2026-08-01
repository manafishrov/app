import type { Component, JSXElement } from 'solid-js';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPositioner,
  AlertDialogTitle,
} from '@manafishrov/ui/alert-dialog';
import { useAppForm } from '@manafishrov/ui/form';
import { Portal } from 'solid-js/web';
import { z } from 'zod';

import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { rovConfigStore } from '@/stores/rovConfig';
import { setRovConfig } from '@/tauri';
import { playConfirmHaptic } from '@/tauri/gamepad';

const MAX_POWER = 100;
const POWER_WARNING_THRESHOLD = 40;
const SLIDER_CLASS =
  'max-w-sm **:data-[slot=slider-track]:relative **:data-[slot=slider-track]:bg-linear-to-r **:data-[slot=slider-track]:from-green-500 **:data-[slot=slider-track]:via-yellow-500 **:data-[slot=slider-track]:to-red-500 [&_[data-slot=slider-track]::after]:content-[""] [&_[data-slot=slider-track]::after]:absolute [&_[data-slot=slider-track]::after]:inset-0 [&_[data-slot=slider-track]::after]:left-[calc(100%-var(--slider-range-end,0%))] [&_[data-slot=slider-track]::after]:bg-muted [&_[data-slot=slider-track]::after]:rounded-full **:data-[slot=slider-range]:bg-transparent [&_[data-scope=slider][data-part=value-text]::after]:content-["%"]';

const formSchema = z
  .object({
    thrustersLimit: z.array(z.number().min(0).max(MAX_POWER)),
    actionsLimit: z.array(z.number().min(0).max(MAX_POWER)),
    regulatorLimit: z.array(z.number().min(0).max(MAX_POWER)),
    minBatteryVoltage: z.number().positive(m.validation_must_be_positive_voltage()),
    maxBatteryVoltage: z.number().positive(m.validation_must_be_positive_voltage()),
  })
  .refine((data) => data.minBatteryVoltage < data.maxBatteryVoltage, {
    message: m.validation_min_voltage_less_than_max(),
    path: ['minBatteryVoltage'],
  });

type PowerSliderName = 'thrustersLimit' | 'actionsLimit' | 'regulatorLimit';
type WarnedSliderName = 'thrustersLimit' | 'regulatorLimit';

type PowerFieldApi = {
  SliderField: (props: {
    class?: string;
    label: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    onValueChangeEnd?: (details: { value: number[] }) => void;
  }) => JSXElement;
  NumberInputField: (props: {
    label: string;
    description?: string;
    min?: number;
    step?: number;
  }) => JSXElement;
};

type PowerFieldName = PowerSliderName | 'minBatteryVoltage' | 'maxBatteryVoltage';

type PowerFieldRenderer = (props: {
  name: PowerFieldName;
  children: (field: PowerFieldApi) => JSXElement;
}) => JSXElement;

type PowerSliderFieldsProps = {
  AppField: PowerFieldRenderer;
  onSliderEnd: (name: WarnedSliderName, value: number[]) => void;
};

const PowerSliderFields: Component<PowerSliderFieldsProps> = (props) => (
  <>
    <props.AppField name='thrustersLimit'>
      {(field) => (
        <field.SliderField
          class={SLIDER_CLASS}
          label={m.power_thrusters_limit_label()}
          description={m.power_thrusters_limit_description()}
          min={0}
          max={MAX_POWER}
          step={1}
          onValueChangeEnd={(details): void => {
            props.onSliderEnd('thrustersLimit', details.value);
          }}
        />
      )}
    </props.AppField>
    <props.AppField name='actionsLimit'>
      {(field) => (
        <field.SliderField
          class={SLIDER_CLASS}
          label={m.power_actions_limit_label()}
          description={m.power_actions_limit_description()}
          min={0}
          max={MAX_POWER}
          step={1}
        />
      )}
    </props.AppField>
    <props.AppField name='regulatorLimit'>
      {(field) => (
        <field.SliderField
          class={SLIDER_CLASS}
          label={m.power_regulator_limit_label()}
          description={m.power_regulator_limit_description()}
          min={0}
          max={MAX_POWER}
          step={1}
          onValueChangeEnd={(details): void => {
            props.onSliderEnd('regulatorLimit', details.value);
          }}
        />
      )}
    </props.AppField>
  </>
);

const PowerVoltageFields: Component<{ AppField: PowerFieldRenderer }> = (props) => (
  <>
    <props.AppField name='minBatteryVoltage'>
      {(field) => (
        <field.NumberInputField
          label={m.power_min_battery_voltage_label()}
          description={m.power_min_battery_voltage_description()}
          min={0}
          step={0.1}
        />
      )}
    </props.AppField>
    <props.AppField name='maxBatteryVoltage'>
      {(field) => (
        <field.NumberInputField
          label={m.power_max_battery_voltage_label()}
          description={m.power_max_battery_voltage_description()}
          min={0}
          step={0.1}
        />
      )}
    </props.AppField>
  </>
);

const PowerFields: Component<PowerSliderFieldsProps> = (props) => (
  <>
    <PowerSliderFields AppField={props.AppField} onSliderEnd={props.onSliderEnd} />
    <PowerVoltageFields AppField={props.AppField} />
  </>
);

const HighPowerWarningDialog: Component<{
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = (props) => (
  <AlertDialog
    open={props.open}
    onOpenChange={(details): void => {
      if (!details.open) {
        props.onCancel();
      }
    }}
  >
    <Portal>
      <AlertDialogOverlay class='rounded-2xl' />
      <AlertDialogPositioner>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.power_high_power_warning_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.power_high_power_warning_description()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={props.onCancel}>
              {m.power_high_power_warning_cancel()}
            </AlertDialogCancel>
            <AlertDialogAction variant='destructive' onClick={props.onConfirm}>
              {m.power_high_power_warning_confirm()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPositioner>
    </Portal>
  </AlertDialog>
);

const submitPowerSettings = (value: z.infer<typeof formSchema>): Promise<void> => {
  const thrustersLimit = value.thrustersLimit[0] ?? rovConfigStore.power.thrustersLimit;
  const actionsLimit = value.actionsLimit[0] ?? rovConfigStore.power.actionsLimit;
  const regulatorLimit = value.regulatorLimit[0] ?? rovConfigStore.power.regulatorLimit;
  return setRovConfig({
    power: {
      thrustersLimit,
      actionsLimit,
      regulatorLimit,
      minBatteryVoltage: value.minBatteryVoltage,
      maxBatteryVoltage: value.maxBatteryVoltage,
    },
  });
};

type HighPowerWarningController = {
  pendingField: () => WarnedSliderName | undefined;
  handleSliderEnd: (name: WarnedSliderName, value: number[]) => void;
  confirmHighPower: () => void;
  cancelHighPower: () => void;
};

const createHighPowerWarning = (form: {
  getFieldValue: (name: WarnedSliderName) => number[];
  setFieldValue: (name: WarnedSliderName, value: number[]) => void;
}): HighPowerWarningController => {
  const lastSettled: Record<WarnedSliderName, number> = {
    thrustersLimit: rovConfigStore.power.thrustersLimit,
    regulatorLimit: rovConfigStore.power.regulatorLimit,
  };
  const [pendingField, setPendingField] = createSignal<WarnedSliderName>();

  return {
    pendingField,
    handleSliderEnd: (name, value): void => {
      const newValue = value[0] ?? 0;
      const previous = lastSettled[name];
      if (newValue > POWER_WARNING_THRESHOLD && previous <= POWER_WARNING_THRESHOLD) {
        playConfirmHaptic(configStore.selectedGamepadId);
        setPendingField(name);
        return;
      }
      lastSettled[name] = newValue;
    },
    confirmHighPower: (): void => {
      const name = pendingField();
      if (name) {
        lastSettled[name] = form.getFieldValue(name)[0] ?? lastSettled[name];
      }
      setPendingField();
    },
    cancelHighPower: (): void => {
      const name = pendingField();
      if (name) {
        form.setFieldValue(name, [POWER_WARNING_THRESHOLD]);
        lastSettled[name] = POWER_WARNING_THRESHOLD;
      }
      setPendingField();
    },
  };
};

export const Power: Component = () => {
  const form = useAppForm(() => ({
    validators: { onChange: formSchema, onSubmit: formSchema },
    defaultValues: {
      thrustersLimit: [rovConfigStore.power.thrustersLimit],
      actionsLimit: [rovConfigStore.power.actionsLimit],
      regulatorLimit: [rovConfigStore.power.regulatorLimit],
      minBatteryVoltage: rovConfigStore.power.minBatteryVoltage,
      maxBatteryVoltage: rovConfigStore.power.maxBatteryVoltage,
    },
    onSubmit: ({ value }): Promise<void> => submitPowerSettings(value),
  }));

  const warning = createHighPowerWarning(form);

  return (
    <form.AppForm>
      <form.Form>
        <PowerFields AppField={form.AppField} onSliderEnd={warning.handleSliderEnd} />
        <form.AutoSubmit debounce={500} />
      </form.Form>
      <HighPowerWarningDialog
        open={Boolean(warning.pendingField())}
        onConfirm={warning.confirmHighPower}
        onCancel={warning.cancelHighPower}
      />
    </form.AppForm>
  );
};

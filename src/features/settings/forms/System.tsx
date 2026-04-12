import type { Component, JSXElement } from 'solid-js';

import { createListCollection } from '@ark-ui/solid/collection';
import { Button } from '@manafishrov/ui/button';
import {
  type SelectFieldProps,
  type SliderFieldProps,
  type TextInputFieldProps,
  useAppForm,
} from '@manafishrov/ui/form';
import { SelectItem } from '@manafishrov/ui/select';
import { z } from 'zod';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { FluidType, MicrocontrollerFirmwareVariant, rovConfigStore } from '@/stores/rovConfig';
import { rovStatusStore } from '@/stores/rovStatus';
import { flashMicrocontrollerFirmware, setRovConfig } from '@/tauri';

type SelectOption = { value: string; label: string };
type SelectCollection = ReturnType<typeof createListCollection<SelectOption>>;

const createFirmwareVariants = (): SelectCollection =>
  createListCollection<SelectOption>({
    items: [
      {
        value: MicrocontrollerFirmwareVariant.pwm as string,
        label: m.general_rov_settings_microcontroller_firmware_pwm(),
      },
      {
        value: MicrocontrollerFirmwareVariant.dshot as string,
        label: m.general_rov_settings_microcontroller_firmware_dshot(),
      },
    ],
  });

const createFluidTypes = (): SelectCollection =>
  createListCollection<SelectOption>({
    items: [
      {
        value: FluidType.freshwater as string,
        label: m.general_rov_settings_fluid_type_freshwater(),
      },
      {
        value: FluidType.saltwater as string,
        label: m.general_rov_settings_fluid_type_saltwater(),
      },
    ],
  });

const MAX_ROV_NAME_LENGTH = 32;

const formSchema = z.object({
  rovName: z.string().min(1).max(MAX_ROV_NAME_LENGTH),
  microcontrollerFirmwareVariant: z
    .array(z.enum([MicrocontrollerFirmwareVariant.pwm, MicrocontrollerFirmwareVariant.dshot]))
    .length(1),
  fluidType: z.array(z.enum([FluidType.freshwater, FluidType.saltwater])).length(1),
  smoothingFactor: z.array(z.number().min(0).max(1)).length(1),
});

type SystemFormValues = z.infer<typeof formSchema>;

const smoothingFactorMarks = [
  { value: 0, label: '0' },
  { value: 0.25, label: '0.25' },
  { value: 0.5, label: '0.5' },
  { value: 0.75, label: '0.75' },
  { value: 1, label: '1' },
];

const submitSystemConfig = (value: SystemFormValues): Promise<void> => {
  const rovName = value.rovName.trim() === '' ? rovConfigStore.rovName : value.rovName;
  const fluidType = value.fluidType[0] ?? rovConfigStore.fluidType;
  const microcontrollerFirmwareVariant =
    value.microcontrollerFirmwareVariant[0] ?? rovConfigStore.microcontrollerFirmwareVariant;
  const smoothingFactor = value.smoothingFactor[0] ?? rovConfigStore.smoothingFactor;

  return setRovConfig({
    rovName,
    fluidType,
    microcontrollerFirmwareVariant,
    smoothingFactor,
  });
};

const flashSelectedFirmware = (): void => {
  flashMicrocontrollerFirmware(rovConfigStore.microcontrollerFirmwareVariant).catch(
    (error: unknown): void => {
      logError('Failed to flash microcontroller firmware:', error);
    },
  );
};

type AppFieldContext = {
  SelectField: Component<SelectFieldProps>;
  SliderField: Component<SliderFieldProps>;
  TextInputField: Component<TextInputFieldProps>;
};

type AppFieldComponent = Component<{
  name: 'rovName' | 'fluidType' | 'microcontrollerFirmwareVariant' | 'smoothingFactor';
  children: (field: AppFieldContext) => JSXElement;
}>;

const RovNameField: Component<{ AppField: AppFieldComponent }> = (props) => (
  <props.AppField name='rovName'>
    {(field: AppFieldContext): JSXElement => (
      <field.TextInputField
        label={m.general_rov_settings_rov_name_title()}
        description={m.general_rov_settings_rov_name_description()}
      />
    )}
  </props.AppField>
);

const FluidTypeField: Component<{ AppField: AppFieldComponent; fluidTypes: SelectCollection }> = (
  props,
) => (
  <props.AppField name='fluidType'>
    {(field: AppFieldContext): JSXElement => (
      <field.SelectField
        label={m.general_rov_settings_fluid_type_title()}
        description={m.general_rov_settings_fluid_type_description()}
        collection={props.fluidTypes}
        placeholder={m.general_rov_settings_fluid_type_select_placeholder()}
      >
        <For each={props.fluidTypes.items}>
          {(item: SelectOption): JSXElement => <SelectItem item={item}>{item.label}</SelectItem>}
        </For>
      </field.SelectField>
    )}
  </props.AppField>
);

const FirmwareField: Component<{
  AppField: AppFieldComponent;
  firmwareVariants: SelectCollection;
  onFlashFirmware: () => void;
}> = (props) => (
  <props.AppField name='microcontrollerFirmwareVariant'>
    {(field: AppFieldContext): JSXElement => (
      <field.SelectField
        label={m.general_rov_settings_microcontroller_firmware_title()}
        description={m.general_rov_settings_microcontroller_firmware_description()}
        collection={props.firmwareVariants}
        placeholder={m.general_rov_settings_microcontroller_firmware_select_placeholder()}
        trailingAddon={
          <Button
            class='w-20'
            type='button'
            variant='outline'
            disabled={!rovStatusStore.health.microcontrollerHealthy}
            onClick={props.onFlashFirmware}
            aria-label={m.general_rov_settings_microcontroller_firmware_title()}
          >
            {m.common_flash()}
          </Button>
        }
      >
        <For each={props.firmwareVariants.items}>
          {(item: SelectOption): JSXElement => <SelectItem item={item}>{item.label}</SelectItem>}
        </For>
      </field.SelectField>
    )}
  </props.AppField>
);

const SmoothingFactorField: Component<{ AppField: AppFieldComponent }> = (props) => (
  <props.AppField name='smoothingFactor'>
    {(field: AppFieldContext): JSXElement => (
      <field.SliderField
        label={m.general_rov_settings_smoothing_factor_title()}
        description={m.general_rov_settings_smoothing_factor_description()}
        min={0}
        max={1}
        step={0.01}
        marks={smoothingFactorMarks}
      />
    )}
  </props.AppField>
);

export const System: Component = () => {
  const firmwareVariants = createFirmwareVariants();
  const fluidTypes = createFluidTypes();
  const form = useAppForm(() => ({
    validators: {
      onChange: formSchema,
      onSubmit: formSchema,
    },
    defaultValues: {
      rovName: rovConfigStore.rovName,
      fluidType: [rovConfigStore.fluidType],
      microcontrollerFirmwareVariant: [rovConfigStore.microcontrollerFirmwareVariant],
      smoothingFactor: [rovConfigStore.smoothingFactor],
    },
    onSubmit: ({ value }: { value: SystemFormValues }): Promise<void> => submitSystemConfig(value),
  }));
  const handleFlashFirmware = (): void => {
    flashSelectedFirmware();
  };

  return (
    <form.AppForm>
      <form.Form>
        <RovNameField AppField={form.AppField} />
        <FluidTypeField AppField={form.AppField} fluidTypes={fluidTypes} />
        <FirmwareField
          AppField={form.AppField}
          firmwareVariants={firmwareVariants}
          onFlashFirmware={handleFlashFirmware}
        />
        <SmoothingFactorField AppField={form.AppField} />
        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};

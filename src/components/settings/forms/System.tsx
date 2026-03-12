import { createListCollection } from '@ark-ui/solid/collection';
import { Button } from '@manafishrov/ui/button';
import { useAppForm } from '@manafishrov/ui/form';
import { SelectItem } from '@manafishrov/ui/select';
import { toast } from '@manafishrov/ui/toaster';
import { type Component, For, createSignal } from 'solid-js';
import { z } from 'zod';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { FluidType, MicrocontrollerFirmwareVariant, rovConfigStore } from '@/stores/rovConfig';
import { flashMicrocontrollerFirmware, setRovConfig } from '@/tauri';

const createFirmwareVariants = () =>
  createListCollection<{ value: string; label: string }>({
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

const createFluidTypes = () =>
  createListCollection<{ value: string; label: string }>({
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

const formSchema = z.object({
  microcontrollerFirmwareVariant: z
    .array(z.enum([MicrocontrollerFirmwareVariant.pwm, MicrocontrollerFirmwareVariant.dshot]))
    .length(1),
  fluidType: z.array(z.enum([FluidType.freshwater, FluidType.saltwater])).length(1),
  smoothingFactor: z.array(z.number().min(0).max(1)).length(1),
});

export const System: Component = () => {
  const [isFlashing, setIsFlashing] = createSignal(false);
  const firmwareVariants = createFirmwareVariants();
  const fluidTypes = createFluidTypes();

  const form = useAppForm(() => ({
    validators: {
      onChange: formSchema,
      onSubmit: formSchema,
    },
    defaultValues: {
      fluidType: [rovConfigStore.fluidType],
      microcontrollerFirmwareVariant: [rovConfigStore.microcontrollerFirmwareVariant],
      smoothingFactor: [rovConfigStore.smoothingFactor],
    },
    onSubmit: ({ value }): Promise<void> => {
      const fluidType = value.fluidType[0] ?? rovConfigStore.fluidType;
      const microcontrollerFirmwareVariant =
        value.microcontrollerFirmwareVariant[0] ?? rovConfigStore.microcontrollerFirmwareVariant;
      const smoothingFactor = value.smoothingFactor[0] ?? rovConfigStore.smoothingFactor;

      return setRovConfig({
        fluidType,
        microcontrollerFirmwareVariant,
        smoothingFactor,
      });
    },
  }));

  const flashSelectedFirmware = (): void => {
    setIsFlashing(true);

    form
      .handleSubmit()
      .then(() => flashMicrocontrollerFirmware(rovConfigStore.microcontrollerFirmwareVariant))
      .then(() => {
        toast.create({ title: m.toasts_firmware_flashing_started(), type: 'success' });
      })
      .catch((error: unknown) => {
        logError('Failed to flash microcontroller firmware:', error);
        toast.create({ title: m.toasts_flash_failed(), type: 'error' });
      })
      .finally(() => {
        setIsFlashing(false);
      });
  };

  return (
    <form.AppForm>
      <form.Form>
        <form.AppField name='fluidType'>
          {(field) => (
            <field.SelectField
              label={m.general_rov_settings_fluid_type_title()}
              description={m.general_rov_settings_fluid_type_description()}
              collection={fluidTypes}
              placeholder={m.general_rov_settings_fluid_type_select_placeholder()}
            >
              <For each={fluidTypes.items}>
                {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
              </For>
            </field.SelectField>
          )}
        </form.AppField>
        <form.AppField name='microcontrollerFirmwareVariant'>
          {(field) => (
            <field.SelectField
              label={m.general_rov_settings_microcontroller_firmware_title()}
              description={m.general_rov_settings_microcontroller_firmware_description()}
              collection={firmwareVariants}
              placeholder={m.general_rov_settings_microcontroller_firmware_select_placeholder()}
              trailingAddon={
                <Button
                  type='button'
                  variant='outline'
                  loading={isFlashing()}
                  onClick={flashSelectedFirmware}
                  aria-label={m.general_rov_settings_microcontroller_firmware_title()}
                >
                  {m.common_flash()}
                </Button>
              }
            >
              <For each={firmwareVariants.items}>
                {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
              </For>
            </field.SelectField>
          )}
        </form.AppField>
        <form.AppField name='smoothingFactor'>
          {(field) => (
            <field.SliderField
              label={m.general_rov_settings_smoothing_factor_title()}
              description={m.general_rov_settings_smoothing_factor_description()}
              min={0}
              max={1}
              step={0.01}
              marks={[
                { value: 0, label: '0' },
                { value: 0.25, label: '0.25' },
                { value: 0.5, label: '0.5' },
                { value: 0.75, label: '0.75' },
                { value: 1, label: '1' },
              ]}
            />
          )}
        </form.AppField>

        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};

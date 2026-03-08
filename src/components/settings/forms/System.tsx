import { createListCollection } from '@ark-ui/solid/collection';
import { Button } from '@manafishrov/ui/button';
import { useAppForm } from '@manafishrov/ui/form';
import { SelectItem } from '@manafishrov/ui/select';
import { toast } from '@manafishrov/ui/toaster';
import { type Component, For, createSignal } from 'solid-js';
import { z } from 'zod';

import { logError } from '@/lib/log';
import { FluidType, MicrocontrollerFirmwareVariant, rovConfigStore } from '@/stores/rovConfig';
import { flashMicrocontrollerFirmware, setRovConfig } from '@/tauri';

const firmwareVariants = createListCollection<{ value: string; label: string }>({
  items: [
    { value: MicrocontrollerFirmwareVariant.pwm as string, label: 'PWM' },
    { value: MicrocontrollerFirmwareVariant.dshot as string, label: 'DShot' },
  ],
});

const fluidTypes = createListCollection<{ value: string; label: string }>({
  items: [
    { value: FluidType.freshwater as string, label: 'Freshwater' },
    { value: FluidType.saltwater as string, label: 'Saltwater' },
  ],
});

const formSchema = z.object({
  microcontrollerFirmwareVariant: z
    .array(z.enum([MicrocontrollerFirmwareVariant.pwm, MicrocontrollerFirmwareVariant.dshot]))
    .length(1),
  fluidType: z.array(z.enum([FluidType.freshwater, FluidType.saltwater])).length(1),
  smoothingFactor: z.number(),
});

export const System: Component = () => {
  const [isFlashing, setIsFlashing] = createSignal(false);

  const form = useAppForm(() => ({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      microcontrollerFirmwareVariant: [rovConfigStore.microcontrollerFirmwareVariant],
      fluidType: [rovConfigStore.fluidType],
      smoothingFactor: rovConfigStore.smoothingFactor,
    },
    onSubmit: ({ value }): Promise<void> => {
      const microcontrollerFirmwareVariant =
        value.microcontrollerFirmwareVariant[0] ?? rovConfigStore.microcontrollerFirmwareVariant;
      const fluidType = value.fluidType[0] ?? rovConfigStore.fluidType;

      return setRovConfig({
        microcontrollerFirmwareVariant,
        fluidType,
        smoothingFactor: value.smoothingFactor,
      });
    },
  }));

  const flashSelectedFirmware = (): void => {
    setIsFlashing(true);

    form
      .handleSubmit()
      .then(() => flashMicrocontrollerFirmware(rovConfigStore.microcontrollerFirmwareVariant))
      .then(() => {
        toast.create({ title: 'Firmware flashing started', type: 'success' });
      })
      .catch((error: unknown) => {
        logError('Failed to flash microcontroller firmware:', error);
        toast.create({ title: 'Failed to flash firmware', type: 'error' });
      })
      .finally(() => {
        setIsFlashing(false);
      });
  };

  return (
    <form.AppForm>
      <form.Form>
        <form.AppField name='microcontrollerFirmwareVariant'>
          {(field) => (
            <field.SelectField
              label='Microcontroller firmware'
              description='Select and flash the firmware with the specified output protocol for the microcontroller that generates the control signals for the thrusters. DShot is a modern digital protocol that supports bi-directional communication, allowing reading of thruster RPM, voltage, current and temperature. However, it can be more sensitive to noise and may introduce higher latency if the ESCs are not powerful enough. PWM is the older analog protocol and does not support feedback, but it is generally more robust. It is recommended to use DShot first, and switch to PWM only if you encounter issues.'
              collection={firmwareVariants}
              placeholder='Select firmware variant'
              trailingAddon={
                <Button
                  type='button'
                  variant='outline'
                  loading={isFlashing()}
                  onClick={flashSelectedFirmware}
                  aria-label='Flash microcontroller firmware'
                >
                  Flash
                </Button>
              }
            >
              <For each={firmwareVariants.items}>
                {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
              </For>
            </field.SelectField>
          )}
        </form.AppField>

        <form.AppField name='fluidType'>
          {(field) => (
            <field.SelectField
              label='Fluid type'
              description='Set correct fluid type to get accurate water pressure readings.'
              collection={fluidTypes}
              placeholder='Select fluid type'
            >
              <For each={fluidTypes.items}>
                {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
              </For>
            </field.SelectField>
          )}
        </form.AppField>

        <form.AppField name='smoothingFactor'>
          {(field) => (
            <field.NumberInputField
              label='Smoothing factor'
              description='How much smoothing applied to the movement of the ROV. Smoothing can be nice for getting smooth movement and camera shots, but it can also make the ROV feel less responsive. 0 leads to no smoothing. As the value approaches 1, the smoothing increases exponentially.'
              min={0}
              max={1}
              step={0.01}
            />
          )}
        </form.AppField>

        <form.AutoSubmit />
      </form.Form>
    </form.AppForm>
  );
};

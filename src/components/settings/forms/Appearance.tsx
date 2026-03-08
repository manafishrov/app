import type { Component } from 'solid-js';

import { useTheme } from '@manafishrov/ui';
import { Theme } from '@manafishrov/ui';
import { useAppForm } from '@manafishrov/ui/form';
import {
  RadioGroupItem,
  RadioGroupItemControl,
  RadioGroupItemText,
} from '@manafishrov/ui/radio-group';
import { z } from 'zod';

import { AttitudeIndicator, configStore, setConfig } from '@/stores/config';

const formSchema = z.object({
  theme: z.enum([Theme.light, Theme.dark, Theme.system]),
  overlayScale: z.array(z.number().int().min(1).max(5)),
  attitudeIndicator: z.enum([
    AttitudeIndicator.scientific,
    AttitudeIndicator.model3D,
    AttitudeIndicator.disabled,
  ]),
  thrusterRpmOverlay: z.boolean(),
  workIndicator: z.boolean(),
});

export const Appearance: Component = () => {
  const { theme, setTheme } = useTheme();

  const form = useAppForm(() => ({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      theme: theme(),
      overlayScale: [configStore.overlayScale],
      attitudeIndicator: configStore.attitudeIndicator,
      thrusterRpmOverlay: configStore.thrusterRpmOverlay,
      workIndicator: configStore.workIndicator,
    },
    onSubmit: ({ value }) => {
      setTheme(value.theme);
      const overlayScale = value.overlayScale[0];
      if (overlayScale !== undefined) {
        setConfig({
          overlayScale,
          attitudeIndicator: value.attitudeIndicator,
          thrusterRpmOverlay: value.thrusterRpmOverlay,
          workIndicator: value.workIndicator,
        });
      }
    },
  }));

  return (
    <form.AppForm>
      <form.Form>
        <form.AppField name='theme'>
          {(field) => (
            <field.RadioGroupField label='Theme' description='Select the application theme.'>
              <RadioGroupItem value='light'>
                <RadioGroupItemControl />
                <RadioGroupItemText>Light</RadioGroupItemText>
              </RadioGroupItem>
              <RadioGroupItem value='dark'>
                <RadioGroupItemControl />
                <RadioGroupItemText>Dark</RadioGroupItemText>
              </RadioGroupItem>
              <RadioGroupItem value='system'>
                <RadioGroupItemControl />
                <RadioGroupItemText>System</RadioGroupItemText>
              </RadioGroupItem>
            </field.RadioGroupField>
          )}
        </form.AppField>
        <form.AppField name='overlayScale'>
          {(field) => (
            <field.SliderField
              class='max-w-sm'
              label='Overlay Scale'
              description='Adjust the scale of the overlay UI.'
              marks={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3' },
                { value: 4, label: '4' },
                { value: 5, label: '5' },
              ]}
              min={1}
              max={5}
              step={1}
            />
          )}
        </form.AppField>
        <form.AppField name='attitudeIndicator'>
          {(field) => (
            <field.RadioGroupField
              label='Attitude Indicator'
              description='Select the attitude indicator style.'
            >
              <RadioGroupItem value='scientific'>
                <RadioGroupItemControl />
                <RadioGroupItemText>Scientific</RadioGroupItemText>
              </RadioGroupItem>
              <RadioGroupItem value='model3D'>
                <RadioGroupItemControl />
                <RadioGroupItemText>3D Model</RadioGroupItemText>
              </RadioGroupItem>
              <RadioGroupItem value='disabled'>
                <RadioGroupItemControl />
                <RadioGroupItemText>Disabled</RadioGroupItemText>
              </RadioGroupItem>
            </field.RadioGroupField>
          )}
        </form.AppField>
        <form.AppField name='thrusterRpmOverlay'>
          {(field) => (
            <field.SwitchField
              label='Thruster RPM Overlay'
              description='Show the thruster RPM overlay on the video feed.'
            />
          )}
        </form.AppField>
        <form.AppField name='workIndicator'>
          {(field) => (
            <field.SwitchField label='Work Indicator' description='Show the work indicator.' />
          )}
        </form.AppField>
        <form.AutoSubmit />
      </form.Form>
    </form.AppForm>
  );
};

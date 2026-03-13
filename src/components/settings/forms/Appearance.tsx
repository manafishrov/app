import type { Component } from 'solid-js';

import { Theme, useTheme } from '@manafishrov/ui';
import { useAppForm } from '@manafishrov/ui/form';
import {
  RadioGroupItem,
  RadioGroupItemControl,
  RadioGroupItemText,
} from '@manafishrov/ui/radio-group';
import { z } from 'zod';

import * as m from '@/paraglide/messages';
import { AttitudeIndicator, configStore, setConfig } from '@/stores/config';

const MIN_SCALE = 1;
const MAX_SCALE = 5;

const formSchema = z.object({
  theme: z.enum([Theme.light, Theme.dark, Theme.system]),
  overlayScale: z.array(z.number().int().min(MIN_SCALE).max(MAX_SCALE)),
  attitudeIndicator: z.enum([
    AttitudeIndicator.scientific,
    AttitudeIndicator.model3D,
    AttitudeIndicator.classic,
    AttitudeIndicator.disabled,
  ]),
  thrusterRpmOverlay: z.boolean(),
  workIndicator: z.boolean(),
});

const OVERLAY_SCALE_MARKS = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
];

const ThemeRadioItems: Component = () => (
  <>
    <RadioGroupItem value='light'><RadioGroupItemControl /><RadioGroupItemText>{m.general_settings_appearance_theme_light()}</RadioGroupItemText></RadioGroupItem>
    <RadioGroupItem value='dark'><RadioGroupItemControl /><RadioGroupItemText>{m.general_settings_appearance_theme_dark()}</RadioGroupItemText></RadioGroupItem>
    <RadioGroupItem value='system'><RadioGroupItemControl /><RadioGroupItemText>{m.general_settings_appearance_theme_system()}</RadioGroupItemText></RadioGroupItem>
  </>
);

const AttitudeIndicatorRadioItems: Component = () => (
  <>
    <RadioGroupItem value={AttitudeIndicator.scientific}><RadioGroupItemControl /><RadioGroupItemText>{m.general_settings_appearance_attitude_indicator_scientific()}</RadioGroupItemText></RadioGroupItem>
    <RadioGroupItem value={AttitudeIndicator.model3D}><RadioGroupItemControl /><RadioGroupItemText>{m.general_settings_appearance_attitude_indicator_3d()}</RadioGroupItemText></RadioGroupItem>
    <RadioGroupItem value={AttitudeIndicator.classic}><RadioGroupItemControl /><RadioGroupItemText>{m.general_settings_appearance_attitude_indicator_classic()}</RadioGroupItemText></RadioGroupItem>
    <RadioGroupItem value={AttitudeIndicator.disabled}><RadioGroupItemControl /><RadioGroupItemText>{m.general_settings_appearance_attitude_indicator_disabled()}</RadioGroupItemText></RadioGroupItem>
  </>
);

const handleFormSubmit = (setTheme: (theme: Theme) => void) => ({ value }: { value: z.infer<typeof formSchema> }): void => {
  setTheme(value.theme);
  const [overlayScale] = value.overlayScale;
  if (typeof overlayScale === 'number') {
    setConfig({
      overlayScale,
      attitudeIndicator: value.attitudeIndicator,
      thrusterRpmOverlay: value.thrusterRpmOverlay,
      workIndicator: value.workIndicator,
    }).catch(() => {
      // Ignore
    });
  }
};

const getDefaultValues = (theme: Theme): z.infer<typeof formSchema> => ({
  theme,
  overlayScale: [configStore.overlayScale],
  attitudeIndicator: configStore.attitudeIndicator,
  thrusterRpmOverlay: configStore.thrusterRpmOverlay,
  workIndicator: configStore.workIndicator,
});

export const Appearance: Component = () => {
  const { theme, setTheme } = useTheme();

  const form = useAppForm(() => ({
    validators: { onSubmit: formSchema },
    defaultValues: getDefaultValues(theme()),
    onSubmit: handleFormSubmit(setTheme),
  }));

  return (
    <form.AppForm>
      <form.Form>
        <form.AppField name='theme'>{(field) => (<field.RadioGroupField label={m.general_settings_appearance_theme_title()} description={m.general_settings_appearance_theme_description()}><ThemeRadioItems /></field.RadioGroupField>)}</form.AppField>
        <form.AppField name='overlayScale'>{(field) => (<field.SliderField class='max-w-sm' label={m.general_settings_appearance_overlay_scale_title()} description={m.general_settings_appearance_overlay_scale_description()} marks={OVERLAY_SCALE_MARKS} min={MIN_SCALE} max={MAX_SCALE} step={1} />)}</form.AppField>
        <form.AppField name='attitudeIndicator'>{(field) => (<field.RadioGroupField label={m.general_settings_appearance_attitude_indicator_title()} description={m.general_settings_appearance_attitude_indicator_description()}><AttitudeIndicatorRadioItems /></field.RadioGroupField>)}</form.AppField>
        <form.AppField name='thrusterRpmOverlay'>{(field) => (<field.SwitchField label={m.general_settings_appearance_thruster_rpm_overlay_title()} description={m.general_settings_appearance_thruster_rpm_overlay_description()} />)}</form.AppField>
        <form.AppField name='workIndicator'>{(field) => (<field.SwitchField label={m.general_settings_appearance_work_indicator_title()} description={m.general_settings_appearance_work_indicator_description()} />)}</form.AppField>
        <form.AutoSubmit />
      </form.Form>
    </form.AppForm>
  );
};

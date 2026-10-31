import type { Component, JSXElement } from 'solid-js';

import { Theme, useTheme } from '@manafishrov/ui';
import { useAppForm } from '@manafishrov/ui/form';
import {
  RadioGroupItem,
  RadioGroupItemControl,
  RadioGroupItemText,
} from '@manafishrov/ui/radio-group';
import { z } from 'zod';

import * as m from '@/paraglide/messages';

const formSchema = z.object({
  theme: z.enum([Theme.light, Theme.dark, Theme.system]),
});

const ThemeRadioItems: Component = () => (
  <>
    <RadioGroupItem value='light'>
      <RadioGroupItemControl />
      <RadioGroupItemText>{m.general_settings_appearance_theme_light()}</RadioGroupItemText>
    </RadioGroupItem>
    <RadioGroupItem value='dark'>
      <RadioGroupItemControl />
      <RadioGroupItemText>{m.general_settings_appearance_theme_dark()}</RadioGroupItemText>
    </RadioGroupItem>
    <RadioGroupItem value='system'>
      <RadioGroupItemControl />
      <RadioGroupItemText>{m.general_settings_appearance_theme_system()}</RadioGroupItemText>
    </RadioGroupItem>
  </>
);

type AppearanceFieldApi = {
  RadioGroupField: (props: {
    label: string;
    description?: string;
    children: JSXElement;
  }) => JSXElement;
};

type AppearanceFieldRenderer = (props: {
  name: 'theme';
  children: (field: AppearanceFieldApi) => JSXElement;
}) => JSXElement;

const AppearanceFields: Component<{ AppField: AppearanceFieldRenderer }> = (props) => (
  <props.AppField name='theme'>
    {(field) => (
      <field.RadioGroupField
        label={m.general_settings_appearance_theme_title()}
        description={m.general_settings_appearance_theme_description()}
      >
        <ThemeRadioItems />
      </field.RadioGroupField>
    )}
  </props.AppField>
);

const handleFormSubmit =
  (setTheme: (theme: Theme) => void) =>
  ({ value }: { value: z.infer<typeof formSchema> }): void => {
    setTheme(value.theme);
  };

export const Appearance: Component = () => {
  const { theme, setTheme } = useTheme();
  const form = useAppForm(() => ({
    validators: { onSubmit: formSchema },
    defaultValues: { theme: theme() },
    onSubmit: handleFormSubmit(setTheme),
  }));

  return (
    <form.AppForm>
      <form.Form>
        <AppearanceFields AppField={form.AppField} />
        <form.AutoSubmit />
      </form.Form>
    </form.AppForm>
  );
};

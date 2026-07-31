import type { Component, JSXElement } from 'solid-js';

import {
  type NumberInputFieldProps,
  type TextInputFieldProps,
  useAppForm,
} from '@manafishrov/ui/form';
import { revalidateLogic } from '@tanstack/solid-form';
import { z } from 'zod';

import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';
import { updateRovConnection } from '@/tauri';

const MAX_PORT = 65_535;

const formSchema = z.object({
  ipAddress: z.ipv4(m.validation_invalid_ip_address()),
  websocketPort: z
    .number()
    .int()
    .min(1, m.validation_port_must_be_between())
    .max(MAX_PORT, m.validation_port_must_be_between()),
});

type RovConnectionFormValues = z.infer<typeof formSchema>;

const submitRovConnectionConfig = (value: RovConnectionFormValues): Promise<void> =>
  updateRovConnection(value);

type AppFieldContext = {
  NumberInputField: Component<NumberInputFieldProps>;
  TextInputField: Component<TextInputFieldProps>;
};

type AppFieldComponent = Component<{
  name: keyof RovConnectionFormValues;
  children: (field: AppFieldContext) => JSXElement;
}>;

const IpAddressTextInputField: Component<{ AppField: AppFieldComponent }> = (props) => (
  <props.AppField name='ipAddress'>
    {(field: AppFieldContext): JSXElement => (
      <field.TextInputField
        label={m.rov_connection_ip_address_label()}
        placeholder='10.10.10.10'
        description={m.rov_connection_ip_address_description()}
      />
    )}
  </props.AppField>
);

const WebsocketPortNumberInputField: Component<{ AppField: AppFieldComponent }> = (props) => (
  <props.AppField name='websocketPort'>
    {(field: AppFieldContext): JSXElement => (
      <field.NumberInputField
        label={m.rov_connection_websocket_port_label()}
        placeholder='9000'
        description={m.rov_connection_websocket_port_description()}
        min={1}
        max={MAX_PORT}
      />
    )}
  </props.AppField>
);

export const RovConnection: Component = () => {
  const form = useAppForm(() => ({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    defaultValues: {
      ipAddress: rovConfigStore.ipAddress,
      websocketPort: rovConfigStore.websocketPort,
    },
    onSubmit: ({ value }: { value: RovConnectionFormValues }): Promise<void> =>
      submitRovConnectionConfig(value),
  }));

  return (
    <form.AppForm>
      <form.Form>
        <IpAddressTextInputField AppField={form.AppField} />
        <WebsocketPortNumberInputField AppField={form.AppField} />
        <form.SubmitButton>{m.common_save()}</form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
};

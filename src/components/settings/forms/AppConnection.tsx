import type { Component } from 'solid-js';

import { useAppForm } from '@manafishrov/ui/form';
import { revalidateLogic } from '@tanstack/solid-form';
import { z } from 'zod';

import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { setConfig } from '@/tauri';

const MAX_PORT = 65_535;

const formSchema = z.object({
  ipAddress: z.ipv4(m.validation_invalid_ip_address()),
  webrtcSignalingApiPort: z
    .number()
    .int()
    .min(1, m.validation_port_must_be_between())
    .max(MAX_PORT, m.validation_port_must_be_between()),
  webrtcSignalingApiPath: z.string().startsWith('/', m.validation_path_must_start_with_slash()),
  webSocketPort: z
    .number()
    .int()
    .min(1, m.validation_port_must_be_between())
    .max(MAX_PORT, m.validation_port_must_be_between()),
});

export const AppConnection: Component = () => {
  const form = useAppForm(() => ({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    defaultValues: {
      ipAddress: configStore.ipAddress,
      webrtcSignalingApiPort: configStore.webrtcSignalingApiPort,
      webrtcSignalingApiPath: configStore.webrtcSignalingApiPath,
      webSocketPort: configStore.webSocketPort,
    },
    onSubmit: ({ value }): Promise<void> => setConfig(value),
  }));

  return (
    <form.AppForm>
      <form.Form>
        <form.AppField name='ipAddress'>
          {(field) => <field.TextInputField label={m.app_connection_ip_address_label()} placeholder={m.app_connection_ip_address_placeholder()} description={m.app_connection_ip_address_description()} />}
        </form.AppField>
        <form.AppField name='webrtcSignalingApiPort'>
          {(field) => <field.NumberInputField label={m.app_connection_webrtc_signaling_api_port_label()} placeholder={m.app_connection_webrtc_signaling_api_port_placeholder()} description={m.app_connection_webrtc_signaling_api_port_description()} min={1} max={MAX_PORT} />}
        </form.AppField>
        <form.AppField name='webrtcSignalingApiPath'>
          {(field) => <field.TextInputField label={m.app_connection_webrtc_signaling_api_path_label()} placeholder={m.app_connection_webrtc_signaling_api_path_placeholder()} description={m.app_connection_webrtc_signaling_api_path_description()} />}
        </form.AppField>
        <form.AppField name='webSocketPort'>
          {(field) => <field.NumberInputField label={m.app_connection_web_socket_port_label()} placeholder={m.app_connection_web_socket_port_placeholder()} description={m.app_connection_web_socket_port_description()} min={1} max={MAX_PORT} />}
        </form.AppField>
        <form.SubmitButton>{m.common_save()}</form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
};

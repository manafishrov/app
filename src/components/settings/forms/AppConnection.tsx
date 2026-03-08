import type { Component } from 'solid-js';

import { useAppForm } from '@manafishrov/ui/form';
import { z } from 'zod';

import { configStore } from '@/stores/config';
import { setConfig } from '@/tauri';

const formSchema = z.object({
  ipAddress: z.string().ip('Invalid IP address'),
  webrtcSignalingApiPort: z
    .number()
    .int()
    .min(1, 'Port must be between 1 and 65535')
    .max(65_535, 'Port must be between 1 and 65535'),
  webrtcSignalingApiPath: z.string().startsWith('/', 'Path must start with a /'),
  webSocketPort: z
    .number()
    .int()
    .min(1, 'Port must be between 1 and 65535')
    .max(65_535, 'Port must be between 1 and 65535'),
});

export const AppConnection: Component = () => {
  const config = useStore(configStore, (state) =>
    state
      ? {
          ipAddress: state.ipAddress,
          webrtcSignalingApiPort: state.webrtcSignalingApiPort,
          webrtcSignalingApiPath: state.webrtcSignalingApiPath,
          webSocketPort: state.webSocketPort,
        }
      : null,
  );

  const form = useAppForm({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      ipAddress: config?.ipAddress ?? '',
      webrtcSignalingApiPort: config?.webrtcSignalingApiPort ?? 0,
      webrtcSignalingApiPath: config?.webrtcSignalingApiPath ?? '',
      webSocketPort: config?.webSocketPort ?? 0,
    },
    onSubmit: ({ value }) => setConfig(value),
  });

  // useEffect(() => {
  //   if (config) {
  //     form.reset({
  //       ipAddress: config.ipAddress,
  //       webrtcSignalingApiPort: config.webrtcSignalingApiPort,
  //       webrtcSignalingApiPath: config.webrtcSignalingApiPath,
  //       webSocketPort: config.webSocketPort,
  //     });
  //   }
  // }, [config, form]);

  return (
    <form.AppForm>
      <form.Form>
        <form.AppField name='ipAddress'>
          {(field) => (
            <field.TextInputField
              label='IP address'
              placeholder='10.10.10.10'
              description='The IP address of your Manafish.'
            />
          )}
        </form.AppField>
        <form.AppField name='webrtcSignalingApiPort'>
          {(field) => (
            <field.NumberInputField
              label='WebRTC signaling API port'
              placeholder='1984'
              description='The port number for the WebRTC signaling API (used for establishing the video stream connection).'
            />
          )}
        </form.AppField>
        <form.AppField name='webrtcSignalingApiPath'>
          {(field) => (
            <field.TextInputField
              label='WebRTC signaling API path'
              placeholder='/api/webrtc?src=cam'
              description='The path for the WebRTC signaling API.'
            />
          )}
        </form.AppField>
        <form.AppField name='webSocketPort'>
          {(field) => (
            <field.NumberInputField
              label='WebSocket port'
              placeholder='5000'
              description='The port number for the WebSocket connection (used for controlling the ROV and obtaining status).'
            />
          )}
        </form.AppField>
        <form.SubmitButton class='w-28'>Save</form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
};

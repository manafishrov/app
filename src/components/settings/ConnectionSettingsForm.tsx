import { useStore } from '@tanstack/react-store';
import { useEffect } from 'react';
import { z } from 'zod';

import { useAppForm } from '@/components/ui/Form';

import { configStore, setConfig } from '@/stores/config';

const formSchema = z.object({
  ipAddress: z.string().ip('Invalid IP address'),
  webrtcSignalingApiPort: z
    .number()
    .int()
    .min(1, 'Port must be between 1 and 65535')
    .max(65535, 'Port must be between 1 and 65535'),
  webrtcSignalingApiPath: z
    .string()
    .startsWith('/', 'Path must start with a /'),
  webSocketPort: z
    .number()
    .int()
    .min(1, 'Port must be between 1 and 65535')
    .max(65535, 'Port must be between 1 and 65535'),
});

function ConnectionSettingsForm() {
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

  useEffect(() => {
    if (config) {
      form.reset({
        ipAddress: config.ipAddress,
        webrtcSignalingApiPort: config.webrtcSignalingApiPort,
        webrtcSignalingApiPath: config.webrtcSignalingApiPath,
        webSocketPort: config.webSocketPort,
      });
    }
  }, [config, form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className='relative space-y-8'
    >
      <form.AppForm>
        <form.AppField name='ipAddress'>
          {(field) => (
            <field.TextField
              label='IP Address'
              placeholder='10.10.10.10'
              description='The IP address of your Manafish.'
            />
          )}
        </form.AppField>
        <form.AppField name='webrtcSignalingApiPort'>
          {(field) => (
            <field.NumberField
              label='WebRTC Signaling API Port'
              placeholder='1984'
              description='The port number for the WebRTC signaling API (used for establishing the video stream connection).'
            />
          )}
        </form.AppField>
        <form.AppField name='webrtcSignalingApiPath'>
          {(field) => (
            <field.TextField
              label='WebRTC Signaling API Path'
              placeholder='/api/webrtc?src=cam'
              description='The path for the WebRTC signaling API.'
            />
          )}
        </form.AppField>
        <form.AppField name='webSocketPort'>
          {(field) => (
            <field.NumberField
              label='WebSocket Port'
              placeholder='5000'
              description='The port number for the WebSocket connection (used for controlling the ROV and obtaining status).'
            />
          )}
        </form.AppField>
        <form.SubmitButton className='w-28'>Save</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}

export { ConnectionSettingsForm };

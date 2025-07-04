import { useStore } from '@tanstack/react-store';
import { useEffect } from 'react';
import { z } from 'zod';

import { useAppForm } from '@/components/ui/Form';

import { configStore, updateConfig } from '@/stores/configStore';

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
  const config = useStore(configStore)

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
    onSubmit: ({ value }) => updateConfig(value),
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

  if (!config) return;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className='relative grow space-y-8'
    >
      <form.AppForm>
        <form.AppField name='ipAddress'>
          {(field) => (
            <field.TextField
              label='IP address'
              placeholder='10.10.10.10'
              description='The IP address of your Manafish.'
            />
          )}
        </form.AppField>
        <form.AppField name='webrtcSignalingApiPort'>
          {(field) => (
            <field.NumberField
              label='WebRTC signaling API port'
              placeholder='1984'
              description='The port number for the WebRTC signaling API (used for establishing the video stream connection).'
            />
          )}
        </form.AppField>
        <form.AppField name='webrtcSignalingApiPath'>
          {(field) => (
            <field.TextField
              label='WebRTC signaling API path'
              placeholder='/api/webrtc?src=cam'
              description='The path for the WebRTC signaling API.'
            />
          )}
        </form.AppField>
        <form.AppField name='webSocketPort'>
          {(field) => (
            <field.NumberField
              label='WebSocket port'
              placeholder='5000'
              description='The port number for the WebSocket connection (used for controlling the ROV and obtaining status).'
            />
          )}
        </form.AppField>
        <form.SubmitButton>Save</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}

export { ConnectionSettingsForm };

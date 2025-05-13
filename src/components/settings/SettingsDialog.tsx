import { useStore } from '@tanstack/react-store';
import { SettingsIcon } from 'lucide-react';
import { useEffect } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { useAppForm } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toaster';

import { configStore, updateConnectionSettings } from '@/stores/configStore';

const formSchema = z.object({
  ipAddress: z.string(),
  cameraStreamPort: z.number(),
  webSocketPort: z.number(),
});

function SettingsDialog() {
  const config = useStore(configStore, (state) => state);

  const form = useAppForm({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      ipAddress: config?.ipAddress ?? '',
      cameraStreamPort: config?.cameraStreamPort ?? 0,
      webSocketPort: config?.webSocketPort ?? 0,
    },
    onSubmit: async ({ value }) => {
      try {
        await updateConnectionSettings(
          value.ipAddress,
          value.cameraStreamPort,
          value.webSocketPort,
        );
        toast.success('Settings updated');
      } catch (error) {
        console.error('Failed to update settings:', error);
        toast.error('Failed to update settings');
      }
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        ipAddress: config.ipAddress,
        cameraStreamPort: config.cameraStreamPort,
        webSocketPort: config.webSocketPort,
      });
    }
  }, [config, form]);

  if (!config) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='icon'>
          <SettingsIcon className='h-[1.2rem] w-[1.2rem]' />
          <span className='sr-only'>Show connection settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Configure your Cyberfish Raspberry Pi connection settings.
        </DialogDescription>
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
                  description='The IP address of your Cyberfish Raspberry Pi.'
                />
              )}
            </form.AppField>
            <form.AppField name='cameraStreamPort'>
              {(field) => (
                <field.NumberField
                  label='Camera stream port'
                  placeholder='8889'
                  description='The port number for the camera stream'
                />
              )}
            </form.AppField>
            <form.AppField name='webSocketPort'>
              {(field) => (
                <field.NumberField
                  label='WebSocket port'
                  placeholder='5000'
                  description='The port number for the WebSocket connection (used for controlling the ROV and obtaining statuses)'
                />
              )}
            </form.AppField>
            <form.SubmitButton>Save</form.SubmitButton>
          </form.AppForm>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { SettingsDialog };

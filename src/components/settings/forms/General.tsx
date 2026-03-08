import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { useAppForm } from '@manafishrov/ui/form';
import { toast } from '@manafishrov/ui/toaster';
import { open } from '@tauri-apps/plugin-dialog';
import { z } from 'zod';

import { logError } from '@/lib/log';
import { configStore, setConfig } from '@/stores/config';

const formSchema = z.object({
  videoDirectory: z.string().min(1, 'Video directory is required'),
});

export const General: Component = () => {
  const form = useAppForm(() => ({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      videoDirectory: configStore.videoDirectory,
    },
    onSubmit: ({ value }) => {
      setConfig({ videoDirectory: value.videoDirectory });
    },
  }));

  async function selectVideoDirectory() {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: 'Select Video Directory',
        defaultPath: configStore.videoDirectory,
      });
      if (typeof result === 'string') {
        form.setFieldValue('videoDirectory', result);
        await form.handleSubmit();
      }
    } catch (error) {
      logError('Error opening file picker dialog:', error);
      toast.create({ title: 'Failed to open file picker dialog', type: 'error' });
    }
  }

  return (
    <form.AppForm>
      <form.Form>
        <form.AppField name='videoDirectory'>
          {(field) => (
            <field.TextInputField
              label='Video Directory'
              description='Set the directory where recordings are stored.'
              readonly
              trailingAddon={
                <Button
                  onClick={selectVideoDirectory}
                  aria-label='Select Video Directory'
                  variant='outline'
                >
                  Select Directory
                </Button>
              }
            />
          )}
        </form.AppField>
        <form.AutoSubmit />
      </form.Form>
    </form.AppForm>
  );
};

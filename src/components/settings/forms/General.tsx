import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { useAppForm } from '@manafishrov/ui/form';
import { toast } from '@manafishrov/ui/toaster';
import { open } from '@tauri-apps/plugin-dialog';
import { z } from 'zod';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore, setConfig } from '@/stores/config';

const createFormSchema = () =>
  z.object({
    videoDirectory: z.string().min(1, m.general_settings_video_directory_required()),
  });

export const General: Component = () => {
  const formSchema = createFormSchema();

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
        title: m.general_settings_video_directory_select_dialog_title(),
        defaultPath: configStore.videoDirectory,
      });
      if (typeof result === 'string') {
        form.setFieldValue('videoDirectory', result);
        await form.handleSubmit();
      }
    } catch (error) {
      logError('Error opening file picker dialog:', error);
      toast.create({ title: m.toasts_failed_to_open_file_picker_dialog(), type: 'error' });
    }
  }

  return (
    <form.AppForm>
      <form.Form>
        <form.AppField name='videoDirectory'>
          {(field) => (
            <field.TextInputField
              label={m.general_settings_video_directory_title()}
              description={m.general_settings_video_directory_description()}
              readonly
              trailingAddon={
                <Button
                  onClick={selectVideoDirectory}
                  aria-label={m.aria_labels_select_video_directory()}
                  variant='outline'
                >
                  {m.general_settings_video_directory_select_directory()}
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

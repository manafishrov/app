import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { useAppForm } from '@manafishrov/ui/form';
import { toast } from '@manafishrov/ui/toaster';
import { open } from '@tauri-apps/plugin-dialog';
import { z } from 'zod';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore, setConfig } from '@/stores/config';

const createFormSchema = (): z.ZodObject<{ videoDirectory: z.ZodString }> =>
  z.object({
    videoDirectory: z.string().min(1, m.general_settings_video_directory_required()),
  });

type FormActions = {
  setFieldValue: (field: 'videoDirectory', value: string) => void;
  handleSubmit: () => Promise<void>;
};

const handleSelectVideoDirectory = (actions: FormActions): void => {
  open({
    directory: true,
    multiple: false,
    title: m.general_settings_video_directory_select_dialog_title(),
    defaultPath: configStore.videoDirectory,
  })
    .then((result): void => {
      if (typeof result === 'string') {
        actions.setFieldValue('videoDirectory', result);
        actions.handleSubmit().catch((error: unknown): void => {
          logError('Error submitting form:', error);
        });
      }
    })
    .catch((error: unknown): void => {
      logError('Error opening file picker dialog:', error);
      toast.create({ title: m.toasts_failed_to_open_file_picker_dialog(), type: 'error' });
    });
};

export const General: Component = () => {
  const formSchema = createFormSchema();

  const form = useAppForm(() => ({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      videoDirectory: configStore.videoDirectory,
    },
    onSubmit: ({ value }): void => {
      setConfig({ videoDirectory: value.videoDirectory }).catch((error: unknown): void => {
        logError('Error setting config:', error);
      });
    },
  }));

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
                  onClick={(): void => {
                    handleSelectVideoDirectory({
                      setFieldValue: (fieldName, value) => {
                        form.setFieldValue(fieldName, value);
                      },
                      handleSubmit: () => form.handleSubmit(),
                    });
                  }}
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

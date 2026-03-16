import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { useAppForm } from '@manafishrov/ui/form';
import { toast } from '@manafishrov/ui/toaster';
import { open } from '@tauri-apps/plugin-dialog';
import { z } from 'zod';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore, setConfig } from '@/stores/config';

const createFormSchema = (): z.ZodObject<{
  videoDirectory: z.ZodString;
  checkForUpdatesOnStartup: z.ZodBoolean;
}> =>
  z.object({
    videoDirectory: z.string().min(1, m.general_settings_video_directory_required()),
    checkForUpdatesOnStartup: z.boolean(),
  });

const handleSelectVideoDirectory = (
  setFieldValue: (value: string) => void,
  handleSubmit: () => Promise<void>,
): void => {
  open({
    directory: true,
    multiple: false,
    title: m.general_settings_video_directory_select_dialog_title(),
    defaultPath: configStore.videoDirectory,
  })
    .then((result): void => {
      if (typeof result === 'string') {
        setFieldValue(result);
        handleSubmit().catch(logError);
      }
    })
    .catch((error: unknown): void => {
      logError('Error opening file picker dialog:', error);
      toast.create({ title: m.toasts_failed_to_open_file_picker_dialog(), type: 'error' });
    });
};

const handleFormSubmit = ({
  value,
}: {
  value: { videoDirectory: string; checkForUpdatesOnStartup: boolean };
}): void => {
  setConfig({
    videoDirectory: value.videoDirectory,
    checkForUpdatesOnStartup: value.checkForUpdatesOnStartup,
  }).catch(logError);
};

export const General: Component = () => {
  const formSchema = createFormSchema();

  const form = useAppForm(() => ({
    validators: { onSubmit: formSchema },
    defaultValues: {
      videoDirectory: configStore.videoDirectory,
      checkForUpdatesOnStartup: configStore.checkForUpdatesOnStartup,
    },
    onSubmit: handleFormSubmit,
  }));

  const handleSelect = (): void => {
    handleSelectVideoDirectory(
      (value) => {
        form.setFieldValue('videoDirectory', value);
      },
      () => form.handleSubmit(),
    );
  };

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
                  onClick={handleSelect}
                  aria-label={m.aria_labels_select_video_directory()}
                  variant='outline'
                >
                  {m.general_settings_video_directory_select_directory()}
                </Button>
              }
            />
          )}
        </form.AppField>
        <form.AppField name='checkForUpdatesOnStartup'>
          {(field) => (
            <field.CheckboxField
              label={m.general_settings_check_for_updates_title()}
              description={m.general_settings_check_for_updates_description()}
            />
          )}
        </form.AppField>
        <form.AutoSubmit />
      </form.Form>
    </form.AppForm>
  );
};

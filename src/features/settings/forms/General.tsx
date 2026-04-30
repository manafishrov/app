import type { Component, JSXElement } from 'solid-js';

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
  checkForAppUpdatesOnStartup: z.ZodBoolean;
  checkForFirmwareUpdatesOnConnect: z.ZodBoolean;
}> =>
  z.object({
    videoDirectory: z.string().min(1, m.general_settings_video_directory_required()),
    checkForAppUpdatesOnStartup: z.boolean(),
    checkForFirmwareUpdatesOnConnect: z.boolean(),
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
  value: {
    videoDirectory: string;
    checkForAppUpdatesOnStartup: boolean;
    checkForFirmwareUpdatesOnConnect: boolean;
  };
}): void => {
  setConfig({
    videoDirectory: value.videoDirectory,
    checkForAppUpdatesOnStartup: value.checkForAppUpdatesOnStartup,
    checkForFirmwareUpdatesOnConnect: value.checkForFirmwareUpdatesOnConnect,
  }).catch(logError);
};

type GeneralFieldApi = {
  TextInputField: (props: {
    label: string;
    description?: string;
    readonly?: boolean;
    trailingAddon?: JSXElement;
  }) => JSXElement;
  SwitchField: (props: { label: string; description?: string }) => JSXElement;
};

type GeneralFieldName =
  | 'videoDirectory'
  | 'checkForAppUpdatesOnStartup'
  | 'checkForFirmwareUpdatesOnConnect';

type GeneralFieldRenderer = (props: {
  name: GeneralFieldName;
  children: (field: GeneralFieldApi) => JSXElement;
}) => JSXElement;

const GeneralFields: Component<{
  AppField: GeneralFieldRenderer;
  onSelect: () => void;
}> = (props) => (
  <>
    <props.AppField name='videoDirectory'>
      {(field) => (
        <field.TextInputField
          label={m.general_settings_video_directory_title()}
          description={m.general_settings_video_directory_description()}
          readonly
          trailingAddon={
            <Button
              onClick={props.onSelect}
              aria-label={m.aria_labels_select_video_directory()}
              variant='outline'
            >
              {m.general_settings_video_directory_select_directory()}
            </Button>
          }
        />
      )}
    </props.AppField>
    <props.AppField name='checkForAppUpdatesOnStartup'>
      {(field) => (
        <field.SwitchField
          label={m.general_settings_check_for_app_updates_title()}
          description={m.general_settings_check_for_app_updates_description()}
        />
      )}
    </props.AppField>
    <props.AppField name='checkForFirmwareUpdatesOnConnect'>
      {(field) => (
        <field.SwitchField
          label={m.general_settings_check_for_firmware_updates_title()}
          description={m.general_settings_check_for_firmware_updates_description()}
        />
      )}
    </props.AppField>
  </>
);

export const General: Component = () => {
  const formSchema = createFormSchema();

  const form = useAppForm(() => ({
    validators: { onSubmit: formSchema },
    defaultValues: {
      videoDirectory: configStore.videoDirectory,
      checkForAppUpdatesOnStartup: configStore.checkForAppUpdatesOnStartup,
      checkForFirmwareUpdatesOnConnect: configStore.checkForFirmwareUpdatesOnConnect,
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
        <GeneralFields AppField={form.AppField} onSelect={handleSelect} />
        <form.AutoSubmit />
      </form.Form>
    </form.AppForm>
  );
};

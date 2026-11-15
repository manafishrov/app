import type { Component, JSXElement } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { useAppForm } from '@manafishrov/ui/form';
import { toast } from '@manafishrov/ui/toaster';
import { open } from '@tauri-apps/plugin-dialog';
import { z } from 'zod';

import { logError } from '@/lib/log';
import { isMobile } from '@/lib/platform';
import * as m from '@/paraglide/messages';
import { configStore, setConfig } from '@/stores/config';
import { isUpdaterEnabled } from '@/tauri';

import { MobilePhotoDirectory } from './MobilePhotoDirectory';
import { MobileVideoDirectory } from './MobileVideoDirectory';

const createFormSchema = (): z.ZodObject<{
  videoDirectory: z.ZodString;
  photoDirectory: z.ZodString;
  checkForAppUpdatesOnStartup: z.ZodBoolean;
}> =>
  z.object({
    // Mobile stores a picker token where empty means the default folder.
    videoDirectory: isMobile
      ? z.string()
      : z.string().min(1, m.general_settings_video_directory_required()),
    photoDirectory: isMobile
      ? z.string()
      : z.string().min(1, m.general_settings_photo_directory_required()),
    checkForAppUpdatesOnStartup: z.boolean(),
  });

type DirectoryPicker = {
  title: string;
  defaultPath: string;
  setFieldValue: (value: string) => void;
  handleSubmit: () => Promise<void>;
};

const handleSelectDirectory = ({
  title,
  defaultPath,
  setFieldValue,
  handleSubmit,
}: DirectoryPicker): void => {
  open({
    directory: true,
    multiple: false,
    title,
    defaultPath,
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
    photoDirectory: string;
    checkForAppUpdatesOnStartup: boolean;
  };
}): void => {
  setConfig({
    ...(isMobile
      ? {}
      : { videoDirectory: value.videoDirectory, photoDirectory: value.photoDirectory }),
    checkForAppUpdatesOnStartup: value.checkForAppUpdatesOnStartup,
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

type GeneralFieldName = 'videoDirectory' | 'photoDirectory' | 'checkForAppUpdatesOnStartup';

type GeneralFieldRenderer = (props: {
  name: GeneralFieldName;
  children: (field: GeneralFieldApi) => JSXElement;
}) => JSXElement;

type DirectoryFieldProps = {
  AppField: GeneralFieldRenderer;
  name: 'videoDirectory' | 'photoDirectory';
  label: string;
  description: string;
  selectLabel: string;
  ariaLabel: string;
  onSelect: () => void;
  mobileField: JSXElement;
};

/** A folder from the desktop folder picker; mobile shows the system picker field. */
const DirectoryField: Component<DirectoryFieldProps> = (props) => (
  <Show when={!isMobile} fallback={props.mobileField}>
    <props.AppField name={props.name}>
      {(field) => (
        <field.TextInputField
          label={props.label}
          description={props.description}
          readonly
          trailingAddon={
            <Button onClick={props.onSelect} aria-label={props.ariaLabel} variant='outline'>
              {props.selectLabel}
            </Button>
          }
        />
      )}
    </props.AppField>
  </Show>
);

const GeneralFields: Component<{
  AppField: GeneralFieldRenderer;
  onSelectVideo: () => void;
  onSelectPhoto: () => void;
}> = (props) => (
  <>
    <DirectoryField
      AppField={props.AppField}
      name='videoDirectory'
      label={m.general_settings_video_directory_title()}
      description={m.general_settings_video_directory_description()}
      selectLabel={m.general_settings_video_directory_select_directory()}
      ariaLabel={m.aria_labels_select_video_directory()}
      onSelect={props.onSelectVideo}
      mobileField={<MobileVideoDirectory />}
    />
    <DirectoryField
      AppField={props.AppField}
      name='photoDirectory'
      label={m.general_settings_photo_directory_title()}
      description={m.general_settings_photo_directory_description()}
      selectLabel={m.general_settings_photo_directory_select_directory()}
      ariaLabel={m.aria_labels_select_photo_directory()}
      onSelect={props.onSelectPhoto}
      mobileField={<MobilePhotoDirectory />}
    />
    <Show when={isUpdaterEnabled}>
      <props.AppField name='checkForAppUpdatesOnStartup'>
        {(field) => (
          <field.SwitchField
            label={m.general_settings_check_for_app_updates_title()}
            description={m.general_settings_check_for_app_updates_description()}
          />
        )}
      </props.AppField>
    </Show>
  </>
);

export const General: Component = () => {
  const formSchema = createFormSchema();

  const form = useAppForm(() => ({
    validators: { onSubmit: formSchema },
    defaultValues: {
      videoDirectory: configStore.videoDirectory,
      photoDirectory: configStore.photoDirectory,
      checkForAppUpdatesOnStartup: configStore.checkForAppUpdatesOnStartup,
    },
    onSubmit: handleFormSubmit,
  }));

  const handleSelectVideo = (): void => {
    handleSelectDirectory({
      title: m.general_settings_video_directory_select_dialog_title(),
      defaultPath: configStore.videoDirectory,
      setFieldValue: (value) => {
        form.setFieldValue('videoDirectory', value);
      },
      handleSubmit: () => form.handleSubmit(),
    });
  };

  const handleSelectPhoto = (): void => {
    handleSelectDirectory({
      title: m.general_settings_photo_directory_select_dialog_title(),
      defaultPath: configStore.photoDirectory,
      setFieldValue: (value) => {
        form.setFieldValue('photoDirectory', value);
      },
      handleSubmit: () => form.handleSubmit(),
    });
  };

  return (
    <form.AppForm>
      <form.Form>
        <GeneralFields
          AppField={form.AppField}
          onSelectVideo={handleSelectVideo}
          onSelectPhoto={handleSelectPhoto}
        />
        <form.AutoSubmit />
      </form.Form>
    </form.AppForm>
  );
};

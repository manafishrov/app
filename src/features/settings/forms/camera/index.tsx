import type { Component } from 'solid-js';

import { useAppForm } from '@manafishrov/ui/form';

import { configStore, setConfig } from '@/stores/config';
import { setRovConfig } from '@/tauri';

import { ImageFieldset } from './ImageFieldset';
import {
  type CameraFormValues,
  createCameraFormSchema,
  getCameraFormValues,
  resolveCameraConfig,
} from './schema';
import { StreamFieldset } from './StreamFieldset';

const ignoreSubmitResults: () => void = () => 0;

const submitCameraConfig = (value: CameraFormValues): Promise<void> => {
  const rovConfigPromise = setRovConfig({ camera: resolveCameraConfig(value) });
  // Only persist the local automaticBitrate preference when it actually changed - the form auto-submits on every field edit, and re-saving it every time would otherwise show a "config saved" toast on unrelated changes (e.g. adjusting contrast).
  const automaticBitratePromise =
    value.automaticBitrate === configStore.automaticBitrate
      ? Promise.resolve()
      : setConfig({ automaticBitrate: value.automaticBitrate });

  return Promise.all([rovConfigPromise, automaticBitratePromise]).then(ignoreSubmitResults);
};

export const CameraSettingsForm: Component = () => {
  const form = useAppForm(() => ({
    validators: {
      onChange: createCameraFormSchema(),
      onSubmit: createCameraFormSchema(),
    },
    defaultValues: getCameraFormValues(),
    onSubmit: ({ value }: { value: CameraFormValues }): Promise<void> =>
      submitCameraConfig(value).then(() => {
        form.reset(value);
      }),
  }));

  return (
    <form.AppForm>
      <form.Form>
        <StreamFieldset
          AppField={form.AppField}
          useSelector={form.useSelector}
          getFieldValue={form.getFieldValue}
          setFramerate={(value): void => {
            form.setFieldValue('framerate', value);
          }}
          setBitrateMbps={(value): void => {
            form.setFieldValue('bitrateMbps', value);
          }}
        />
        <ImageFieldset AppField={form.AppField} />
        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};

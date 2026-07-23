import type { Component } from 'solid-js';

import { useAppForm } from '@manafishrov/ui/form';

import { setRovConfig } from '@/tauri';

import { ImageFieldset } from './ImageFieldset';
import {
  type CameraFormValues,
  createCameraFormSchema,
  getCameraFormValues,
  resolveCameraConfig,
} from './schema';
import { StreamFieldset } from './StreamFieldset';

const submitCameraConfig = (value: CameraFormValues): Promise<void> =>
  setRovConfig({ camera: resolveCameraConfig(value) });

export const Camera: Component = () => {
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
        <StreamFieldset AppField={form.AppField} />
        <ImageFieldset AppField={form.AppField} />
        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};

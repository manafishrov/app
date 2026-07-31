import type { Component } from 'solid-js';

import { createListCollection } from '@ark-ui/solid/collection';
import { FieldLegend, Fieldset } from '@manafishrov/ui/field';

import * as m from '@/paraglide/messages';
import { AwbMode, DenoiseMode } from '@/stores/rovConfig';

import type {
  CameraFieldRenderer,
  SelectFieldConfig,
  SliderFieldConfig,
  SelectOption,
  SwitchFieldConfig,
} from './fieldTypes';

import {
  BRIGHTNESS_STEP,
  EXPOSURE_STEP,
  IMAGE_ADJUSTMENT_STEP,
  MAX_BRIGHTNESS,
  MAX_EXPOSURE_VALUE,
  MAX_IMAGE_ADJUSTMENT,
  MIN_BRIGHTNESS,
  MIN_EXPOSURE_VALUE,
  MIN_IMAGE_ADJUSTMENT,
} from './constants';
import { CameraSelectField, CameraSliderField, CameraSwitchField } from './FieldRows';

const rotationCollection = createListCollection<SelectOption>({
  items: [
    { value: '0', label: m.camera_settings_rotation_none() },
    { value: '180', label: m.camera_settings_rotation_flipped() },
  ],
});

const awbCollection = createListCollection<SelectOption>({
  items: [
    { value: AwbMode.auto, label: m.camera_settings_awb_auto() },
    { value: AwbMode.incandescent, label: m.camera_settings_awb_incandescent() },
    { value: AwbMode.tungsten, label: m.camera_settings_awb_tungsten() },
    { value: AwbMode.fluorescent, label: m.camera_settings_awb_fluorescent() },
    { value: AwbMode.indoor, label: m.camera_settings_awb_indoor() },
    { value: AwbMode.daylight, label: m.camera_settings_awb_daylight() },
    { value: AwbMode.cloudy, label: m.camera_settings_awb_cloudy() },
  ],
});

const denoiseCollection = createListCollection<SelectOption>({
  items: [
    { value: DenoiseMode.auto, label: m.camera_settings_denoise_auto() },
    { value: DenoiseMode.off, label: m.camera_settings_denoise_off() },
    { value: DenoiseMode.cdnOff, label: m.camera_settings_denoise_cdn_off() },
    { value: DenoiseMode.cdnFast, label: m.camera_settings_denoise_cdn_fast() },
    { value: DenoiseMode.cdnHq, label: m.camera_settings_denoise_cdn_hq() },
  ],
});

const SELECT_FIELDS: SelectFieldConfig[] = [
  {
    name: 'rotation',
    label: m.camera_settings_rotation_title,
    description: m.camera_settings_rotation_description,
    collection: rotationCollection,
  },
  {
    name: 'awb',
    label: m.camera_settings_awb_title,
    description: m.camera_settings_awb_description,
    collection: awbCollection,
  },
  {
    name: 'denoise',
    label: m.camera_settings_denoise_title,
    description: m.camera_settings_denoise_description,
    collection: denoiseCollection,
  },
];

const SWITCH_FIELDS: SwitchFieldConfig[] = [
  {
    name: 'hflip',
    label: m.camera_settings_hflip_title,
    description: m.camera_settings_hflip_description,
  },
  {
    name: 'vflip',
    label: m.camera_settings_vflip_title,
    description: m.camera_settings_vflip_description,
  },
];

const SLIDER_FIELDS: SliderFieldConfig[] = [
  {
    name: 'exposureValue',
    label: m.camera_settings_exposure_value_title,
    description: m.camera_settings_exposure_value_description,
    min: MIN_EXPOSURE_VALUE,
    max: MAX_EXPOSURE_VALUE,
    step: EXPOSURE_STEP,
  },
  {
    name: 'brightness',
    label: m.camera_settings_brightness_title,
    description: m.camera_settings_brightness_description,
    min: MIN_BRIGHTNESS,
    max: MAX_BRIGHTNESS,
    step: BRIGHTNESS_STEP,
  },
  {
    name: 'contrast',
    label: m.camera_settings_contrast_title,
    description: m.camera_settings_contrast_description,
    min: MIN_IMAGE_ADJUSTMENT,
    max: MAX_IMAGE_ADJUSTMENT,
    step: IMAGE_ADJUSTMENT_STEP,
  },
  {
    name: 'saturation',
    label: m.camera_settings_saturation_title,
    description: m.camera_settings_saturation_description,
    min: MIN_IMAGE_ADJUSTMENT,
    max: MAX_IMAGE_ADJUSTMENT,
    step: IMAGE_ADJUSTMENT_STEP,
  },
  {
    name: 'sharpness',
    label: m.camera_settings_sharpness_title,
    description: m.camera_settings_sharpness_description,
    min: MIN_IMAGE_ADJUSTMENT,
    max: MAX_IMAGE_ADJUSTMENT,
    step: IMAGE_ADJUSTMENT_STEP,
  },
];

export const ImageFieldset: Component<{ AppField: CameraFieldRenderer }> = (props) => (
  <Fieldset>
    <FieldLegend>{m.camera_settings_image_title()}</FieldLegend>
    <p class='mb-4 text-sm text-muted-foreground'>{m.camera_settings_image_description()}</p>
    <div class='space-y-4'>
      <For each={SELECT_FIELDS}>
        {(config) => <CameraSelectField AppField={props.AppField} config={config} />}
      </For>
      <For each={SWITCH_FIELDS}>
        {(config) => <CameraSwitchField AppField={props.AppField} config={config} />}
      </For>
      <For each={SLIDER_FIELDS}>
        {(config) => <CameraSliderField AppField={props.AppField} config={config} />}
      </For>
    </div>
  </Fieldset>
);

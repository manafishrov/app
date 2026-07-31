import type { createListCollection } from '@ark-ui/solid/collection';
import type { JSXElement } from 'solid-js';

export type SelectOption = { value: string; label: string };
export type SelectCollection = ReturnType<typeof createListCollection<SelectOption>>;

export type CameraNumberFieldName = 'framerate' | 'keyframeInterval';
export type CameraSelectFieldName =
  | 'resolution'
  | 'profile'
  | 'level'
  | 'rotation'
  | 'awb'
  | 'denoise';
export type CameraSliderFieldName =
  | 'bitrateMbps'
  | 'exposureValue'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'sharpness';
export type CameraSwitchFieldName = 'cropFov' | 'automaticBitrate' | 'hflip' | 'vflip';

export type CameraFieldName =
  | CameraNumberFieldName
  | CameraSelectFieldName
  | CameraSliderFieldName
  | CameraSwitchFieldName;

// Loosely-typed field API passed across component boundaries (see the Power form).
export type CameraFieldApi = {
  NumberInputField: (props: {
    label: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    clampValueOnBlur?: boolean;
    trailingAddon?: JSXElement;
  }) => JSXElement;
  SelectField: (props: {
    label: string;
    description?: string;
    collection: SelectCollection;
    placeholder?: string;
    children: JSXElement;
  }) => JSXElement;
  SliderField: (props: {
    label: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
  }) => JSXElement;
  SwitchField: (props: { label: string; description?: string }) => JSXElement;
};

export type CameraFieldRenderer = (props: {
  name: CameraFieldName;
  children: (field: CameraFieldApi) => JSXElement;
}) => JSXElement;

export type NumberFieldConfig = {
  name: CameraNumberFieldName;
  label: () => string;
  description: () => string;
  min: number;
  max: number;
  step: number;
  addon: string;
};

export type SelectFieldConfig = {
  name: CameraSelectFieldName;
  label: () => string;
  description: () => string;
  collection: SelectCollection;
};

export type SliderFieldConfig = {
  name: CameraSliderFieldName;
  label: () => string;
  description: () => string;
  min: number;
  max: number;
  step: number;
};

export type SwitchFieldConfig = {
  name: CameraSwitchFieldName;
  label: () => string;
  description: () => string;
};

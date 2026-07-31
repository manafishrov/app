import type { Component } from 'solid-js';

import { createListCollection } from '@ark-ui/solid/collection';
import { FieldLegend, Fieldset } from '@manafishrov/ui/field';

import * as m from '@/paraglide/messages';
import { H264Level, H264Profile } from '@/stores/rovConfig';

import type {
  CameraFieldRenderer,
  NumberFieldConfig,
  SelectFieldConfig,
  SelectOption,
  SwitchFieldConfig,
} from './fieldTypes';
import type { CameraFormValues } from './schema';

import { createCameraAutoTune, type CameraTuningForm } from './autoTune';
import {
  ABSOLUTE_MAX_FRAMERATE,
  getMaxFramerate,
  MAX_BITRATE_MBPS,
  MAX_KEYFRAME_INTERVAL,
  MIN_BITRATE_MBPS,
  MIN_FRAMERATE,
  MIN_KEYFRAME_INTERVAL,
  RESOLUTION_OPTIONS,
  ResolutionKey,
} from './constants';
import { CameraNumberInputField, CameraSelectField, CameraSwitchField } from './FieldRows';

const resolutionCollection = createListCollection<SelectOption>({
  items: [
    { value: ResolutionKey.lowest, label: m.camera_settings_resolution_lowest() },
    { value: ResolutionKey.low, label: m.camera_settings_resolution_low() },
    { value: ResolutionKey.standard, label: m.camera_settings_resolution_standard() },
    { value: ResolutionKey.high, label: m.camera_settings_resolution_high() },
    { value: ResolutionKey.max, label: m.camera_settings_resolution_max() },
  ],
});

const profileCollection = createListCollection<SelectOption>({
  items: [
    { value: H264Profile.baseline, label: m.camera_settings_profile_baseline() },
    { value: H264Profile.main, label: m.camera_settings_profile_main() },
    { value: H264Profile.high, label: m.camera_settings_profile_high() },
  ],
});

const levelCollection = createListCollection<SelectOption>({
  items: [
    { value: H264Level.level4, label: m.camera_settings_level_4() },
    { value: H264Level.level41, label: m.camera_settings_level_41() },
    { value: H264Level.level42, label: m.camera_settings_level_42() },
  ],
});

const RESOLUTION_FIELD: SelectFieldConfig = {
  name: 'resolution',
  label: m.camera_settings_resolution_title,
  description: m.camera_settings_resolution_description,
  collection: resolutionCollection,
};

const CROP_FOV_FIELD: SwitchFieldConfig = {
  name: 'cropFov',
  label: m.camera_settings_crop_fov_title,
  description: m.camera_settings_crop_fov_description,
};

const AUTOMATIC_BITRATE_FIELD: SwitchFieldConfig = {
  name: 'automaticBitrate',
  label: m.camera_settings_automatic_bitrate_title,
  description: m.camera_settings_automatic_bitrate_description,
};

const NUMBER_FIELDS: NumberFieldConfig[] = [
  {
    name: 'keyframeInterval',
    label: m.camera_settings_keyframe_interval_title,
    description: m.camera_settings_keyframe_interval_description,
    min: MIN_KEYFRAME_INTERVAL,
    max: MAX_KEYFRAME_INTERVAL,
    step: 1,
    addon: 'frames',
  },
];

const SELECT_FIELDS: SelectFieldConfig[] = [
  {
    name: 'profile',
    label: m.camera_settings_profile_title,
    description: m.camera_settings_profile_description,
    collection: profileCollection,
  },
  {
    name: 'level',
    label: m.camera_settings_level_title,
    description: m.camera_settings_level_description,
    collection: levelCollection,
  },
];

const resolveFramerateMax = (resolutionKey: ResolutionKey, cropFov: boolean): number => {
  const resolution = RESOLUTION_OPTIONS.find((option) => option.value === resolutionKey);
  if (!resolution) {
    return ABSOLUTE_MAX_FRAMERATE;
  }
  return getMaxFramerate(resolution.width, resolution.height, cropFov);
};

const FramerateNumberInputField: Component<{ AppField: CameraFieldRenderer; max: number }> = (
  props,
) => (
  <props.AppField name='framerate'>
    {(field) => (
      <field.NumberInputField
        label={m.camera_settings_framerate_title()}
        description={m.camera_settings_framerate_description()}
        min={MIN_FRAMERATE}
        max={props.max}
        step={1}
        clampValueOnBlur
        trailingAddon='fps'
      />
    )}
  </props.AppField>
);

const BitrateSliderField: Component<{ AppField: CameraFieldRenderer }> = (props) => (
  <props.AppField name='bitrateMbps'>
    {(field) => (
      <field.SliderField
        label={m.camera_settings_bitrate_title()}
        description={m.camera_settings_bitrate_description()}
        min={MIN_BITRATE_MBPS}
        max={MAX_BITRATE_MBPS}
        step={1}
      />
    )}
  </props.AppField>
);

type StreamFieldsetProps = {
  AppField: CameraFieldRenderer;
  useSelector: <TSelected>(
    selector: (state: { values: CameraFormValues }) => TSelected,
  ) => () => TSelected;
} & CameraTuningForm;

const createAutoTuneEffects = (
  props: StreamFieldsetProps,
  signals: {
    resolution: () => ResolutionKey;
    cropFov: () => boolean;
    framerate: () => number;
    automaticBitrate: () => boolean;
  },
): void => {
  const autoTune = createCameraAutoTune(props);
  createEffect(on(signals.resolution, autoTune.handleResolutionChange, { defer: true }));
  createEffect(on(signals.cropFov, autoTune.handleCropFovChange, { defer: true }));
  createEffect(on(signals.framerate, autoTune.handleFramerateChange, { defer: true }));
  createEffect(
    on(signals.automaticBitrate, autoTune.handleAutomaticBitrateChange, { defer: true }),
  );
};

export const StreamFieldset: Component<StreamFieldsetProps> = (props) => {
  const resolution = props.useSelector((state) => state.values.resolution[0] ?? ResolutionKey.high);
  const cropFov = props.useSelector((state) => state.values.cropFov);
  const framerate = props.useSelector((state) => state.values.framerate);
  const automaticBitrate = props.useSelector((state) => state.values.automaticBitrate);
  const framerateMax = createMemo(() => resolveFramerateMax(resolution(), cropFov()));

  createAutoTuneEffects(props, { resolution, cropFov, framerate, automaticBitrate });

  return (
    <Fieldset>
      <FieldLegend>{m.camera_settings_stream_title()}</FieldLegend>
      <p class='mb-4 text-sm text-muted-foreground'>{m.camera_settings_stream_description()}</p>
      <div class='space-y-4'>
        <CameraSelectField AppField={props.AppField} config={RESOLUTION_FIELD} />
        <CameraSwitchField AppField={props.AppField} config={CROP_FOV_FIELD} />
        <FramerateNumberInputField AppField={props.AppField} max={framerateMax()} />
        <CameraSwitchField AppField={props.AppField} config={AUTOMATIC_BITRATE_FIELD} />
        <Show when={!automaticBitrate()}>
          <BitrateSliderField AppField={props.AppField} />
        </Show>
        <For each={NUMBER_FIELDS}>
          {(config) => <CameraNumberInputField AppField={props.AppField} config={config} />}
        </For>
        <For each={SELECT_FIELDS}>
          {(config) => <CameraSelectField AppField={props.AppField} config={config} />}
        </For>
      </div>
    </Fieldset>
  );
};

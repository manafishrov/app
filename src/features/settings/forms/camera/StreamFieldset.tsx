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
} from './fieldTypes';

import {
  MAX_BITRATE_MBPS,
  MAX_FRAMERATE,
  MAX_KEYFRAME_INTERVAL,
  MIN_BITRATE_MBPS,
  MIN_FRAMERATE,
  MIN_KEYFRAME_INTERVAL,
  ResolutionKey,
} from './constants';
import { NumberFieldRow, SelectFieldRow } from './FieldRows';

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

const NUMBER_FIELDS: NumberFieldConfig[] = [
  {
    name: 'framerate',
    label: m.camera_settings_framerate_title,
    description: m.camera_settings_framerate_description,
    min: MIN_FRAMERATE,
    max: MAX_FRAMERATE,
    step: 1,
    addon: 'fps',
  },
  {
    name: 'bitrateMbps',
    label: m.camera_settings_bitrate_title,
    description: m.camera_settings_bitrate_description,
    min: MIN_BITRATE_MBPS,
    max: MAX_BITRATE_MBPS,
    step: 1,
    addon: 'Mbps',
  },
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

export const StreamFieldset: Component<{ AppField: CameraFieldRenderer }> = (props) => (
  <Fieldset>
    <FieldLegend>{m.camera_settings_stream_title()}</FieldLegend>
    <p class='mb-4 text-sm text-muted-foreground'>{m.camera_settings_stream_description()}</p>
    <div class='space-y-4'>
      <SelectFieldRow AppField={props.AppField} config={RESOLUTION_FIELD} />
      <For each={NUMBER_FIELDS}>
        {(config) => <NumberFieldRow AppField={props.AppField} config={config} />}
      </For>
      <For each={SELECT_FIELDS}>
        {(config) => <SelectFieldRow AppField={props.AppField} config={config} />}
      </For>
    </div>
  </Fieldset>
);

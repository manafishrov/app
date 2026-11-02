import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import {
  Checkbox,
  CheckboxControl,
  CheckboxIndicator,
  CheckboxLabel,
} from '@manafishrov/ui/checkbox';
import { H3, P } from '@manafishrov/ui/typography';
import { unwrap } from 'solid-js/store';

import type { DetectionModelInfo } from '@/tauri/detection';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { detectionStore } from '@/stores/detection';
import { setConfig } from '@/tauri/config';

/** Saves the visible class IDs for a model; `null` shows every class. */
const saveFilter = (modelId: string, visible: number[] | null): void => {
  const detection = structuredClone(unwrap(configStore.detection));
  const { [modelId]: _previous, ...classFilters } = detection.classFilters;
  setConfig({
    detection: {
      ...detection,
      classFilters: visible === null ? classFilters : { ...classFilters, [modelId]: visible },
    },
  }).catch(logError);
};

const activeModel = (): DetectionModelInfo | undefined =>
  detectionStore.models.find((candidate) => candidate.id === configStore.detection.modelId);

const isClassVisible = (model: DetectionModelInfo, classId: number): boolean => {
  const filter = configStore.detection.classFilters[model.id];
  return filter ? filter.includes(classId) : true;
};

const setClassVisible = (model: DetectionModelInfo, classId: number, show: boolean): void => {
  const visible = model.classes
    .map((_name, index) => index)
    .filter((index) => (index === classId ? show : isClassVisible(model, index)));
  saveFilter(model.id, visible.length === model.classes.length ? null : visible);
};

const ClassFilterHeader: Component<{ model: DetectionModelInfo }> = (props) => (
  <div class='flex items-start justify-between gap-4'>
    <div class='flex flex-col gap-1'>
      <H3>{m.detection_classes_title()}</H3>
      <P class='text-sm text-muted-foreground'>{m.detection_classes_description()}</P>
    </div>
    <div class='flex gap-2'>
      <Button
        variant='outline'
        size='sm'
        onClick={() => {
          saveFilter(props.model.id, null);
        }}
      >
        {m.detection_classes_show_all()}
      </Button>
      <Button
        variant='outline'
        size='sm'
        onClick={() => {
          saveFilter(props.model.id, []);
        }}
      >
        {m.detection_classes_hide_all()}
      </Button>
    </div>
  </div>
);

const ClassCheckboxes: Component<{ model: DetectionModelInfo }> = (props) => (
  <div class='grid max-h-72 grid-cols-2 gap-x-4 gap-y-3 overflow-y-auto rounded-lg border p-3 sm:grid-cols-3'>
    <For each={props.model.classes}>
      {(name, index) => (
        <Checkbox
          checked={isClassVisible(props.model, index())}
          onCheckedChange={(details) => {
            setClassVisible(props.model, index(), details.checked === true);
          }}
        >
          <CheckboxControl>
            <CheckboxIndicator />
          </CheckboxControl>
          <CheckboxLabel>{name}</CheckboxLabel>
        </Checkbox>
      )}
    </For>
  </div>
);

export const ClassFilter: Component = () => (
  <Show when={activeModel()}>
    {(model) => (
      <section class='flex flex-col gap-3'>
        <ClassFilterHeader model={model()} />
        <ClassCheckboxes model={model()} />
      </section>
    )}
  </Show>
);

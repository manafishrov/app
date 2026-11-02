import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { Button } from '@manafishrov/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@manafishrov/ui/item';
import { toast } from '@manafishrov/ui/toaster';
import { H3, P } from '@manafishrov/ui/typography';
import { open } from '@tauri-apps/plugin-dialog';
import { unwrap } from 'solid-js/store';
import DeleteIcon from '~icons/material-symbols/delete';
import DownloadIcon from '~icons/material-symbols/download';
import UploadFileIcon from '~icons/material-symbols/upload-file';

import { refreshDetectionModels } from '@/features/detection/controller';
import { selectModelIfNoneActive } from '@/features/detection/models';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { detectionStore } from '@/stores/detection';
import { setConfig } from '@/tauri/config';
import {
  type DetectionModelInfo,
  deleteDetectionModel,
  importDetectionModel,
} from '@/tauri/detection';

import { ModelCatalog } from './ModelCatalog';

const BYTES_PER_MEGABYTE = 1_048_576;
const EXPORT_COMMAND = 'yolo export model=best.pt format=onnx';

const describeModel = (model: DetectionModelInfo): string =>
  [
    m.detection_model_classes({ count: model.classes.length }),
    `${String(model.inputWidth)}×${String(model.inputHeight)}`,
    `${(model.fileSize / BYTES_PER_MEGABYTE).toFixed(1)} MB`,
    model.license,
  ]
    .filter((part) => part !== null && part !== '')
    .join(' · ');

const importModel = (): void => {
  open({
    multiple: false,
    directory: false,
    title: m.detection_import_dialog_title(),
    filters: [{ name: m.detection_import_filter_name(), extensions: ['onnx'] }],
  })
    .then((path) => {
      if (typeof path !== 'string') {
        return;
      }
      const toastId = toast.create({ title: m.detection_import_loading(), type: 'loading' });
      return importDetectionModel(path)
        .then((model) =>
          refreshDetectionModels()
            .then(() => selectModelIfNoneActive(model.id))
            .then(() => {
              toast.update(toastId, {
                title: m.detection_import_success({ name: model.name }),
                type: 'success',
              });
            }),
        )
        .catch((error: unknown) => {
          logError('Failed to import detection model:', error);
          toast.update(toastId, {
            title: m.detection_import_failed(),
            description: String(error),
            type: 'error',
          });
        });
    })
    .catch((error: unknown) => {
      logError('Error opening file picker dialog:', error);
      toast.create({ title: m.toasts_failed_to_open_file_picker_dialog(), type: 'error' });
    });
};

const removeModelFromConfig = (model: DetectionModelInfo): Promise<void> => {
  const detection = structuredClone(unwrap(configStore.detection));
  const { [model.id]: _removed, ...classFilters } = detection.classFilters;
  const wasActive = detection.modelId === model.id;
  return setConfig({
    detection: {
      ...detection,
      classFilters,
      modelId: wasActive ? null : detection.modelId,
      enabled: wasActive ? false : detection.enabled,
    },
  });
};

const deleteModel = (model: DetectionModelInfo): void => {
  deleteDetectionModel(model.id)
    .then(() => removeModelFromConfig(model))
    .then(() => refreshDetectionModels())
    .catch((error: unknown) => {
      logError('Failed to delete detection model:', error);
      toast.create({
        title: m.detection_delete_failed(),
        description: String(error),
        type: 'error',
      });
    });
};

const ModelItem: Component<{ model: DetectionModelInfo }> = (props) => (
  <Item variant='outline'>
    <ItemContent>
      <ItemTitle>
        {props.model.name}
        <Show when={configStore.detection.modelId === props.model.id}>
          <Badge variant='secondary'>{m.detection_model_active()}</Badge>
        </Show>
      </ItemTitle>
      <ItemDescription>{describeModel(props.model)}</ItemDescription>
    </ItemContent>
    <ItemActions>
      <Button
        variant='ghost'
        size='icon'
        aria-label={m.detection_delete_model({ name: props.model.name })}
        onClick={() => {
          deleteModel(props.model);
        }}
      >
        <DeleteIcon />
      </Button>
    </ItemActions>
  </Item>
);

export const ModelLibrary: Component = () => {
  const [showCatalog, setShowCatalog] = createSignal(false);
  return (
    <section class='flex flex-col gap-3'>
      <div class='flex flex-wrap items-start justify-between gap-4'>
        <div class='flex flex-col gap-1'>
          <H3>{m.detection_models_title()}</H3>
          <P class='text-sm text-muted-foreground'>
            {m.detection_models_description()} <code>{EXPORT_COMMAND}</code>
          </P>
        </div>
        <div class='flex flex-wrap gap-2'>
          <Button
            variant='outline'
            aria-expanded={showCatalog()}
            onClick={() => setShowCatalog((shown) => !shown)}
          >
            <DownloadIcon />
            {m.detection_download_model_button()}
          </Button>
          <Button variant='outline' onClick={importModel}>
            <UploadFileIcon />
            {m.detection_import_button()}
          </Button>
        </div>
      </div>
      <Show when={showCatalog()}>
        <ModelCatalog />
      </Show>
      <Show
        when={detectionStore.models.length > 0}
        fallback={<P class='text-sm text-muted-foreground'>{m.detection_models_empty()}</P>}
      >
        <ItemGroup class='gap-2'>
          <For each={detectionStore.models}>{(model) => <ModelItem model={model} />}</For>
        </ItemGroup>
      </Show>
    </section>
  );
};

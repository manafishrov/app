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
import { H3, P } from '@manafishrov/ui/typography';
import { openUrl } from '@tauri-apps/plugin-opener';
import DownloadIcon from '~icons/material-symbols/download';

import {
  cancelModelDownload,
  modelDownloads,
  startModelDownload,
} from '@/features/detection/modelDownloads';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { detectionStore } from '@/stores/detection';
import { type DetectionCatalogModel, listDetectionCatalog } from '@/tauri/detection';

const BYTES_PER_MEGABYTE = 1_048_576;
const PERCENT = 100;
const MODEL_ID_LENGTH = 16;
type ModelProps = { model: DetectionCatalogModel };

const descriptions: Record<string, () => string> = {
  yolo26n: m.detection_catalog_yolo26n,
  yolo26s: m.detection_catalog_yolo26s,
  yolo26m: m.detection_catalog_yolo26m,
  yolo11n: m.detection_catalog_yolo11n,
  yolo11s: m.detection_catalog_yolo11s,
  'marine-fishinv': m.detection_catalog_fishinv,
  'marine-megafauna': m.detection_catalog_megafauna,
};

const describeModel = (id: string): string => {
  const describe = descriptions[id];
  return describe ? describe() : '';
};

const isAvailable = (model: DetectionCatalogModel): boolean =>
  Boolean(model.asset && model.asset.url);

const isInstalled = (model: DetectionCatalogModel): boolean => {
  const modelId = model.asset && model.asset.sha256.slice(0, MODEL_ID_LENGTH);
  return modelId !== null && detectionStore.models.some((installed) => installed.id === modelId);
};

const isCancelling = (id: string): boolean => {
  const state = modelDownloads[id];
  return Boolean(state && state.phase === 'cancelling');
};

const progressLabel = (id: string): string => {
  const state = modelDownloads[id];
  if (state && state.phase === 'validating') {
    return m.detection_download_validating();
  }
  if (state && state.phase === 'cancelling') {
    return m.detection_download_cancelling();
  }
  const percent = state ? Math.round((state.downloadedBytes / state.totalBytes) * PERCENT) : 0;
  return m.detection_download_progress({ percent });
};

const CatalogDetails: Component<ModelProps> = (props) => (
  <>
    <ItemDescription>{describeModel(props.model.id)}</ItemDescription>
    <ItemDescription>
      <Show when={props.model.asset}>
        {(asset) => <>{(asset().fileSize / BYTES_PER_MEGABYTE).toFixed(1)} MB · </>}
      </Show>
      {props.model.license === 'NOASSERTION'
        ? m.detection_catalog_license_unconfirmed()
        : props.model.license}
      {' · '}
      <button
        type='button'
        class='underline underline-offset-2'
        onClick={() => {
          openUrl(props.model.sourceUrl).catch(logError);
        }}
      >
        {m.detection_catalog_source()}
      </button>
    </ItemDescription>
    <Show when={!isAvailable(props.model)}>
      <ItemDescription>{m.detection_catalog_unavailable_description()}</ItemDescription>
    </Show>
  </>
);

const CatalogProgress: Component<ModelProps> = (props) => (
  <Show when={modelDownloads[props.model.id]}>
    {(state) => (
      <div class='flex flex-col gap-1 text-sm' role='status' aria-live='polite'>
        <span>{progressLabel(props.model.id)}</span>
        <progress
          class='h-2 w-full accent-primary'
          aria-label={m.detection_download_model({ name: props.model.name })}
          max={state().totalBytes}
          value={state().downloadedBytes}
        />
      </div>
    )}
  </Show>
);

const CatalogActions: Component<ModelProps> = (props) => (
  <ItemActions>
    <Show
      when={modelDownloads[props.model.id]}
      fallback={
        <Show
          when={!isInstalled(props.model)}
          fallback={<Badge variant='secondary'>{m.detection_catalog_installed()}</Badge>}
        >
          <Button
            variant='outline'
            disabled={!isAvailable(props.model)}
            aria-label={m.detection_download_model({ name: props.model.name })}
            onClick={() => {
              startModelDownload(props.model).catch(logError);
            }}
          >
            <DownloadIcon />
            {isAvailable(props.model)
              ? m.detection_download_button()
              : m.detection_catalog_unavailable()}
          </Button>
        </Show>
      }
    >
      <Button
        variant='outline'
        disabled={isCancelling(props.model.id)}
        onClick={() => {
          cancelModelDownload(props.model.id).catch(logError);
        }}
      >
        {m.detection_download_cancel()}
      </Button>
    </Show>
  </ItemActions>
);

const CatalogItem: Component<ModelProps> = (props) => (
  <Item variant='outline' class='flex-wrap'>
    <ItemContent>
      <ItemTitle>
        {props.model.name}
        <Show when={props.model.id === 'yolo26n'}>
          <Badge variant='secondary'>{m.detection_catalog_recommended()}</Badge>
        </Show>
        <Show when={props.model.experimental}>
          <Badge variant='outline'>{m.detection_catalog_experimental()}</Badge>
        </Show>
      </ItemTitle>
      <CatalogDetails model={props.model} />
      <CatalogProgress model={props.model} />
    </ItemContent>
    <CatalogActions model={props.model} />
  </Item>
);

export const ModelCatalog: Component = () => {
  const [catalog, { refetch }] = createResource(listDetectionCatalog);
  return (
    <section class='flex flex-col gap-3'>
      <H3>{m.detection_catalog_title()}</H3>
      <P class='text-sm text-muted-foreground'>{m.detection_catalog_description()}</P>
      <Show
        when={catalog.state !== 'errored'}
        fallback={
          <div class='flex items-center justify-between gap-3'>
            <P>{m.detection_catalog_failed()}</P>
            <Button
              variant='outline'
              onClick={() => {
                Promise.resolve(refetch()).catch(logError);
              }}
            >
              {m.detection_catalog_retry()}
            </Button>
          </div>
        }
      >
        <Show when={!catalog.loading} fallback={<P>{m.detection_catalog_loading()}</P>}>
          <ItemGroup class='gap-2'>
            <For each={catalog()}>{(model) => <CatalogItem model={model} />}</For>
          </ItemGroup>
        </Show>
      </Show>
    </section>
  );
};

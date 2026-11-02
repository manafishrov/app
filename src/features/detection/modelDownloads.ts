import { toast } from '@manafishrov/ui/toaster';
import { createStore } from 'solid-js/store';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import {
  cancelDetectionModelDownload,
  type DetectionCatalogModel,
  downloadDetectionModel,
  type ModelDownloadProgress,
} from '@/tauri/detection';

import { refreshDetectionModels } from './controller';
import { selectModelIfNoneActive } from './models';

type DownloadState = {
  generation: number;
  phase: 'downloading' | 'validating' | 'cancelling';
  downloadedBytes: number;
  totalBytes: number;
};

// Downloads and their progress survive navigating away from settings.
const [modelDownloads, setModelDownloads] = createStore<
  Partial<Record<string, DownloadState | null>>
>({});
export { modelDownloads };
let nextGeneration = 0;

const updateProgress = (id: string, generation: number, progress: ModelDownloadProgress): void => {
  const current = modelDownloads[id];
  if (!current || current.generation !== generation || current.phase === 'cancelling') {
    return;
  }
  if (progress.type === 'validating') {
    setModelDownloads(id, 'phase', 'validating');
  } else {
    setModelDownloads(id, {
      phase: 'downloading',
      downloadedBytes: progress.downloadedBytes,
      totalBytes: progress.totalBytes,
    });
  }
};

export const startModelDownload = (model: DetectionCatalogModel): Promise<void> => {
  if (
    modelDownloads[model.id] ||
    !model.asset ||
    model.asset.url === null ||
    model.asset.url === ''
  ) {
    return Promise.resolve();
  }
  nextGeneration += 1;
  const generation = nextGeneration;
  setModelDownloads(model.id, {
    generation,
    phase: 'downloading',
    downloadedBytes: 0,
    totalBytes: model.asset.fileSize,
  });
  return downloadDetectionModel(model.id, (progress) => {
    updateProgress(model.id, generation, progress);
  })
    .then((installed) =>
      refreshDetectionModels()
        .then(() => selectModelIfNoneActive(installed.id))
        .then(() => {
          toast.create({
            title: m.detection_download_success({ name: model.name }),
            type: 'success',
          });
        }),
    )
    .catch((error: unknown) => {
      if (String(error) === 'Model download cancelled') {
        return;
      }
      logError('Failed to download detection model:', error);
      toast.create({
        title: m.detection_download_failed(),
        description: String(error),
        type: 'error',
      });
    })
    .finally(() => {
      const current = modelDownloads[model.id];
      if (current && current.generation === generation) {
        setModelDownloads(model.id, null);
      }
    });
};

export const cancelModelDownload = (id: string): Promise<void> => {
  const previous = modelDownloads[id];
  if (!previous || previous.phase === 'cancelling') {
    return Promise.resolve();
  }
  const { phase: previousPhase, generation } = previous;
  setModelDownloads(id, 'phase', 'cancelling');
  return cancelDetectionModelDownload(id).catch((error: unknown) => {
    // The original operation may have finished while the cancel IPC was pending.
    const current = modelDownloads[id];
    if (!current || current.generation !== generation) {
      return;
    }
    if (current.phase === 'cancelling') {
      setModelDownloads(id, 'phase', previousPhase);
    }
    logError('Failed to cancel detection model download:', error);
    toast.create({
      title: m.detection_download_cancel_failed(),
      description: String(error),
      type: 'error',
    });
  });
};

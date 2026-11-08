// @vitest-environment happy-dom
import { toast } from '@manafishrov/ui/toaster';
import { beforeEach, expect, it, vi } from 'vitest';

import { configStore, defaultConfig, setConfigStore } from '@/stores/config';
import { setConfig } from '@/tauri/config';
import {
  cancelDetectionModelDownload,
  type DetectionCatalogModel,
  type DetectionModelInfo,
  downloadDetectionModel,
  type ModelDownloadProgress,
} from '@/tauri/detection';

import { refreshDetectionModels } from './controller';
import { cancelModelDownload, modelDownloads, startModelDownload } from './modelDownloads';

vi.mock('@manafishrov/ui/toaster', () => ({ toast: { create: vi.fn() } }));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));
vi.mock('./controller', () => ({
  refreshDetectionModels: vi.fn<typeof refreshDetectionModels>().mockResolvedValue(),
}));
vi.mock('@/tauri/config', () => ({ setConfig: vi.fn<typeof setConfig>().mockResolvedValue() }));
vi.mock('@/tauri/detection', () => ({
  downloadDetectionModel: vi.fn(),
  cancelDetectionModelDownload: vi.fn(),
}));

const SHA_LENGTH = 64;
const ID_LENGTH = 16;
const FILE_SIZE = 100;
const PROGRESS_BYTES = 30;
const TWO_DOWNLOADS = 2;
const model: DetectionCatalogModel = {
  id: 'yolo26n',
  name: 'YOLO26n',
  license: 'AGPL-3.0',
  sourceUrl: 'https://example.com',
  experimental: false,
  asset: {
    fileName: 'yolo26n.onnx',
    fileSize: FILE_SIZE,
    sha256: 'a'.repeat(SHA_LENGTH),
    url: 'https://example.com/model.onnx',
  },
};
const installed: DetectionModelInfo = {
  id: 'a'.repeat(ID_LENGTH),
  name: model.name,
  fileSize: FILE_SIZE,
  importedAt: 0,
  classes: ['person'],
  inputWidth: 640,
  inputHeight: 640,
  description: null,
  author: null,
  license: 'AGPL-3.0',
};

const notInitialized = (): never => {
  throw new Error('Promise is not initialized');
};
const firstDownloadProgress = (): ((progress: ModelDownloadProgress) => void) => {
  const [call] = vi.mocked(downloadDetectionModel).mock.calls;
  if (!call) {
    throw new Error('The first download did not start');
  }
  return call[1];
};
const pendingDownload = (): {
  promise: Promise<DetectionModelInfo>;
  complete: (value: DetectionModelInfo) => void;
  fail: (error: string) => void;
} => {
  let complete: (value: DetectionModelInfo) => void = notInitialized;
  let fail: (error: string) => void = notInitialized;
  const promise = new Promise<DetectionModelInfo>((resolve, reject) => {
    complete = resolve;
    fail = reject;
  });
  return { promise, complete, fail };
};

beforeEach(() => {
  vi.clearAllMocks();
  setConfigStore({ ...defaultConfig, detection: { ...defaultConfig.detection, modelId: null } });
  vi.mocked(downloadDetectionModel).mockResolvedValue(installed);
  vi.mocked(cancelDetectionModelDownload).mockResolvedValue();
});

it('refreshes the library and selects the first downloaded model', () =>
  startModelDownload(model).then(() => {
    expect(refreshDetectionModels).toHaveBeenCalledOnce();
    expect(setConfig).toHaveBeenCalledWith({
      detection: { ...configStore.detection, modelId: installed.id },
    });
    expect(modelDownloads[model.id]).toBeNull();
  }));

it('keeps a selection changed while downloading and prevents duplicate requests', () => {
  const pending = pendingDownload();
  vi.mocked(downloadDetectionModel).mockImplementationOnce((_id, progress) => {
    progress({ type: 'downloading', downloadedBytes: PROGRESS_BYTES, totalBytes: FILE_SIZE });
    return pending.promise;
  });
  const downloading = Promise.all([startModelDownload(model), startModelDownload(model)]);
  expect(modelDownloads[model.id]).toMatchObject({ downloadedBytes: PROGRESS_BYTES });
  expect(downloadDetectionModel).toHaveBeenCalledOnce();
  setConfigStore({
    ...defaultConfig,
    detection: { ...defaultConfig.detection, modelId: 'chosen-while-downloading' },
  });
  pending.complete(installed);
  return downloading.then(() => {
    expect(setConfig).not.toHaveBeenCalled();
  });
});

it('cancels, clears progress, and allows retry without an error toast', () => {
  const pending = pendingDownload();
  vi.mocked(downloadDetectionModel).mockReturnValueOnce(pending.promise);
  vi.mocked(cancelDetectionModelDownload).mockImplementationOnce(() => {
    pending.fail('Model download cancelled');
    return Promise.resolve();
  });
  const downloading = startModelDownload(model);
  return cancelModelDownload(model.id)
    .then(() => downloading)
    .then(() => {
      expect(cancelDetectionModelDownload).toHaveBeenCalledWith(model.id);
      expect(modelDownloads[model.id]).toBeNull();
      expect(toast.create).not.toHaveBeenCalled();
      expect(refreshDetectionModels).not.toHaveBeenCalled();
      return startModelDownload(model);
    })
    .then(() => {
      expect(downloadDetectionModel).toHaveBeenCalledTimes(TWO_DOWNLOADS);
    });
});

it('reports failure without selecting a model or refreshing the library', () => {
  vi.mocked(downloadDetectionModel).mockRejectedValueOnce('SHA-256 mismatch');
  return startModelDownload(model).then(() => {
    expect(toast.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'SHA-256 mismatch', type: 'error' }),
    );
    expect(setConfig).not.toHaveBeenCalled();
    expect(refreshDetectionModels).not.toHaveBeenCalled();
    expect(modelDownloads[model.id]).toBeNull();
  });
});

it('does not start an unpublished marine download', () =>
  startModelDownload({ ...model, id: 'marine-fishinv', asset: null }).then(() => {
    expect(downloadDetectionModel).not.toHaveBeenCalled();
  }));

it('ignores an old progress channel after the same model is downloaded again', () =>
  startModelDownload(model).then(() => {
    const staleProgress = firstDownloadProgress();
    const second = pendingDownload();
    vi.mocked(downloadDetectionModel).mockReturnValueOnce(second.promise);
    const retry = startModelDownload(model);
    try {
      staleProgress({ type: 'downloading', downloadedBytes: FILE_SIZE, totalBytes: FILE_SIZE });
      expect(modelDownloads[model.id]).toMatchObject({ downloadedBytes: 0 });
    } finally {
      second.complete(installed);
    }
    return retry;
  }));

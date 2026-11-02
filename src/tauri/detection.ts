import { Channel, invoke } from '@tauri-apps/api/core';

import type { ExecutionProviderPreference } from '@/stores/configTypes';

export type ExecutionProvider = 'cpu' | 'coreMl' | 'directMl' | 'webGpu';

export type DetectionModelInfo = {
  id: string;
  name: string;
  fileSize: number;
  importedAt: number;
  classes: string[];
  inputWidth: number;
  inputHeight: number;
  description: string | null;
  author: string | null;
  license: string | null;
};

export type DetectionCatalogModel = {
  id: string;
  name: string;
  license: string;
  sourceUrl: string;
  experimental: boolean;
  asset: {
    fileName: string;
    fileSize: number;
    sha256: string;
    url: string | null;
  } | null;
};

export type ModelDownloadProgress =
  | { type: 'downloading'; downloadedBytes: number; totalBytes: number }
  | { type: 'validating' };

export type Detection = {
  trackId: number;
  classId: number;
  label: string;
  confidence: number;
  // Box in 0..1 coordinates of the source frame, from the top-left corner.
  left: number;
  top: number;
  width: number;
  height: number;
};

export type DetectionRunState = 'loading' | 'connecting' | 'running' | 'error';

export type DetectionEvent =
  | {
      type: 'status';
      state: DetectionRunState;
      message: string | null;
      executionProvider: ExecutionProvider | null;
    }
  | {
      type: 'detections';
      capturedAt: number;
      frameWidth: number;
      frameHeight: number;
      detections: Detection[];
    }
  | {
      type: 'stats';
      inferenceFps: number;
      inferenceMs: number;
      latencyMs: number;
    };

export type DetectionOptions = {
  modelId: string;
  executionProvider: ExecutionProviderPreference;
  confidenceThreshold: number;
  classIds: number[] | null;
  streamUrl: string;
};

// The ROV's go2rtc service serves the camera over RTSP on this port.
const RTSP_PORT = 8554;
const RTSP_STREAM = 'cam';

export const detectionStreamUrl = (ipAddress: string): string =>
  `rtsp://${ipAddress}:${String(RTSP_PORT)}/${RTSP_STREAM}`;

export const listDetectionModels = (): Promise<DetectionModelInfo[]> =>
  invoke<DetectionModelInfo[]>('list_detection_models');

export const listDetectionCatalog = (): Promise<DetectionCatalogModel[]> =>
  invoke<DetectionCatalogModel[]>('list_detection_catalog');

export const downloadDetectionModel = (
  id: string,
  onProgress: (progress: ModelDownloadProgress) => void,
): Promise<DetectionModelInfo> => {
  const progress = new Channel<ModelDownloadProgress>();
  // oxlint-disable-next-line unicorn/prefer-add-event-listener -- Tauri channels expose onmessage only.
  progress.onmessage = onProgress;
  return invoke<DetectionModelInfo>('download_detection_model', { id, onProgress: progress });
};

export const cancelDetectionModelDownload = (id: string): Promise<void> =>
  invoke('cancel_detection_model_download', { id });

export const importDetectionModel = (path: string): Promise<DetectionModelInfo> =>
  invoke<DetectionModelInfo>('import_detection_model', { path });

export const deleteDetectionModel = (id: string): Promise<void> =>
  invoke('delete_detection_model', { id });

export const startDetection = (
  options: DetectionOptions,
  onEvent: (event: DetectionEvent) => void,
): Promise<void> => {
  const events = new Channel<DetectionEvent>();
  // oxlint-disable-next-line unicorn/prefer-add-event-listener -- Tauri channels expose onmessage only.
  events.onmessage = onEvent;
  return invoke('start_detection', { options, onEvent: events });
};

export const stopDetection = (): Promise<void> => invoke('stop_detection');

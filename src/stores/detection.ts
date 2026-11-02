import { createStore } from 'solid-js/store';

import type {
  Detection,
  DetectionModelInfo,
  DetectionRunState,
  ExecutionProvider,
} from '@/tauri/detection';

type DetectionFrame = {
  capturedAt: number;
  frameWidth: number;
  frameHeight: number;
  detections: Detection[];
};

type DetectionStats = {
  inferenceFps: number;
  inferenceMs: number;
  latencyMs: number;
};

type DetectionStore = {
  models: DetectionModelInfo[];
  state: DetectionRunState | 'stopped';
  message: string | null;
  executionProvider: ExecutionProvider | null;
  stats: DetectionStats | null;
  frame: DetectionFrame | null;
};

const [detectionStore, setDetectionStore] = createStore<DetectionStore>({
  models: [],
  state: 'stopped',
  message: null,
  executionProvider: null,
  stats: null,
  frame: null,
});

export { detectionStore, setDetectionStore, type DetectionFrame, type DetectionStats };

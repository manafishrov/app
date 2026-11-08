import { toast } from '@manafishrov/ui/toaster';
import { unwrap } from 'solid-js/store';

import { logError, logInfo, logWarn } from '@/lib/log';
import { isMobile } from '@/lib/platform';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { detectionStore, setDetectionStore } from '@/stores/detection';
import { setConfig } from '@/tauri/config';
import {
  type DetectionEvent,
  type DetectionOptions,
  detectionStreamUrl,
  listDetectionModels,
  startDetection,
  stopDetection,
} from '@/tauri/detection';

import { captureReady, captureVideo, startMobileCapture } from './mobileCapture';
import { foreground, resumeGeneration, useMobileLifecycle } from './mobileLifecycle';

/** Restarting reloads the model, so let bursts of changes (such as dragging a slider) settle. */
const RESTART_DEBOUNCE_MS = 400;
let captureSequence = 0;

type StatusEvent = Extract<DetectionEvent, { type: 'status' }>;

const resolveOptions = (): DetectionOptions | null => {
  const { detection, ipAddress } = configStore;
  if (
    !detection.enabled ||
    detection.modelId === null ||
    (isMobile && (!foreground() || captureVideo() === null || !captureReady()))
  ) {
    return null;
  }
  const classIds = detection.classFilters[detection.modelId];
  return {
    modelId: detection.modelId,
    executionProvider: detection.executionProvider,
    confidenceThreshold: detection.confidenceThreshold,
    classIds: classIds ? [...classIds] : null,
    streamUrl: detectionStreamUrl(ipAddress),
  };
};

const handleStatus = (event: StatusEvent): void => {
  if (event.state === 'error') {
    logWarn('Object detection error:', event.message);
  } else if (event.state !== detectionStore.state) {
    logInfo('Object detection is', event.state);
  }
  setDetectionStore({
    state: event.state,
    message: event.message,
    executionProvider: event.executionProvider ?? detectionStore.executionProvider,
  });
  if (event.state !== 'running') {
    setDetectionStore('frame', null);
  }
};

const handleEvent = (event: DetectionEvent): void => {
  if (event.type === 'status') {
    handleStatus(event);
  } else if (event.type === 'detections') {
    const { capturedAt, frameWidth, frameHeight, detections } = event;
    setDetectionStore('frame', { capturedAt, frameWidth, frameHeight, detections });
  } else {
    const { inferenceFps, inferenceMs, latencyMs } = event;
    setDetectionStore('stats', { inferenceFps, inferenceMs, latencyMs });
  }
};

const resetRuntimeState = (paused: boolean): void => {
  setDetectionStore({
    state: paused ? 'paused' : 'stopped',
    message: null,
    executionProvider: null,
    stats: null,
    frame: null,
  });
};

type RestartState = {
  timer: number;
  generation: number;
  pending: Promise<void>;
  stopCapture: (() => void) | null;
};

const cancelCapture = (restart: RestartState): void => {
  globalThis.clearTimeout(restart.timer);
  if (restart.stopCapture) {
    restart.stopCapture();
  }
  restart.stopCapture = null;
};

const start = (
  options: DetectionOptions,
  isCurrent: () => boolean,
  restart: RestartState,
): Promise<void> => {
  captureSequence += 1;
  const runId = captureSequence;
  setDetectionStore({
    state: 'loading',
    message: null,
    executionProvider: null,
    stats: null,
    frame: null,
  });
  return startDetection({ ...options, runId }, (event) => {
    if (isCurrent()) {
      handleEvent(event);
      if (event.type === 'status' && event.state === 'error') {
        cancelCapture(restart);
      }
    }
  })
    .then(() => {
      if (isMobile && isCurrent() && detectionStore.state !== 'error') {
        restart.stopCapture = startMobileCapture(runId, options.modelId, isCurrent);
      }
    })
    .catch((error: unknown) => {
      if (isCurrent()) {
        logError('Failed to start object detection:', error);
        setDetectionStore({ state: 'error', message: String(error) });
      }
    });
};

const scheduleRestart = (restart: RestartState): void => {
  cancelCapture(restart);
  restart.generation += 1;
  const { generation } = restart;
  const isCurrent = (): boolean => restart.generation === generation;
  const options = resolveOptions();
  resetRuntimeState(isMobile && options === null && configStore.detection.enabled);
  if (options === null) {
    restart.pending = restart.pending.then(stopDetection).catch(logError);
    return;
  }
  restart.timer = globalThis.setTimeout(() => {
    restart.pending = restart.pending
      .then(() => (isCurrent() ? start(options, isCurrent, restart) : Promise.resolve()))
      .catch(logError);
  }, RESTART_DEBOUNCE_MS);
};

export const refreshDetectionModels = (): Promise<void> =>
  listDetectionModels()
    .then((models) => {
      setDetectionStore('models', models);
    })
    .catch((error: unknown) => {
      logError('Failed to list detection models:', error);
    });

/** Starts, restarts and stops detection to match the detection settings. */
export const createDetectionController = (): void => {
  const restart: RestartState = {
    timer: 0,
    generation: 0,
    pending: Promise.resolve(),
    stopCapture: null,
  };

  if (isMobile) {
    useMobileLifecycle();
  }
  refreshDetectionModels().catch(logError);

  createEffect(
    on(
      () => JSON.stringify([resolveOptions(), isMobile ? resumeGeneration() : 0]),
      () => {
        scheduleRestart(restart);
      },
    ),
  );

  onCleanup(() => {
    cancelCapture(restart);
    restart.generation += 1;
    restart.pending = restart.pending.then(stopDetection).catch(logError);
  });
};

export const toggleObjectDetection = (): Promise<void> => {
  const detection = structuredClone(unwrap(configStore.detection));
  if (!detection.enabled && detection.modelId === null) {
    toast.create({
      title: m.detection_toast_no_model_title(),
      description: m.detection_toast_no_model_description(),
      type: 'warning',
    });
    return Promise.resolve();
  }
  return setConfig({ detection: { ...detection, enabled: !detection.enabled } });
};

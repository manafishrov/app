import { createStore } from 'solid-js/store';

import { setIsInputSuppressed } from '@/stores/inputState';
import { rovTelemetryStore } from '@/stores/rovTelemetry';
import { setDesiredDepth } from '@/tauri/desiredDepth';

type DesiredDepthPopupStore = {
  isOpen: boolean;
  draftDepth: string;
  lastSentDepth: number;
};

const DEFAULT_DEPTH = '0.0';
const DECIMAL_PRECISION = 1;
const INVALID_DEPTH = Number.NaN;
const SEND_DELAY_MS = 75;

let pendingSyncTimeout = 0;

const [desiredDepthPopupStore, setDesiredDepthPopupStore] = createStore<DesiredDepthPopupStore>({
  isOpen: false,
  draftDepth: DEFAULT_DEPTH,
  lastSentDepth: 0,
});

const formatDepth = (depth: number): string => depth.toFixed(DECIMAL_PRECISION);

const parseDesiredDepthDraft = (): number => {
  const parsedDepth = Number(desiredDepthPopupStore.draftDepth);
  if (!Number.isFinite(parsedDepth) || parsedDepth < 0) {
    return INVALID_DEPTH;
  }

  return Number(parsedDepth.toFixed(DECIMAL_PRECISION));
};

const clearPendingDesiredDepthSync = (): void => {
  if (pendingSyncTimeout > 0) {
    clearTimeout(pendingSyncTimeout);
    pendingSyncTimeout = 0;
  }
};

const ignoreDesiredDepthSyncError = (error: unknown): void => {
  if (error instanceof Error) {
    return;
  }
};

const syncDesiredDepthDraft = (): Promise<void> => {
  const depth = parseDesiredDepthDraft();
  if (Number.isNaN(depth) || depth === desiredDepthPopupStore.lastSentDepth) {
    return Promise.resolve();
  }

  setDesiredDepthPopupStore('lastSentDepth', depth);
  return setDesiredDepth(depth).catch(ignoreDesiredDepthSyncError);
};

const scheduleDesiredDepthSync = (): void => {
  clearPendingDesiredDepthSync();
  pendingSyncTimeout = setTimeout(() => {
    pendingSyncTimeout = 0;
    syncDesiredDepthDraft().catch(ignoreDesiredDepthSyncError);
  }, SEND_DELAY_MS);
};

const setDesiredDepthDraft = (value: string): void => {
  setDesiredDepthPopupStore('draftDepth', value);
  scheduleDesiredDepthSync();
};

const adjustDesiredDepthDraft = (delta: number): void => {
  const parsedDepth = parseDesiredDepthDraft();
  const currentDepth = Number.isNaN(parsedDepth) ? rovTelemetryStore.desiredDepth : parsedDepth;
  const nextDepth = Math.max(0, currentDepth + delta);
  setDesiredDepthDraft(formatDepth(nextDepth));
};

const openDesiredDepthPopup = (initialDepth = rovTelemetryStore.desiredDepth): void => {
  const formattedDepth = formatDepth(Math.max(0, initialDepth));
  const parsedDepth = Number(formattedDepth);

  setDesiredDepthPopupStore({
    isOpen: true,
    draftDepth: formattedDepth,
    lastSentDepth: parsedDepth,
  });
  setIsInputSuppressed(true);
};

const closeDesiredDepthPopup = (): Promise<void> => {
  clearPendingDesiredDepthSync();
  setDesiredDepthPopupStore('isOpen', false);
  setIsInputSuppressed(false);
  return syncDesiredDepthDraft();
};

export {
  adjustDesiredDepthDraft,
  closeDesiredDepthPopup,
  clearPendingDesiredDepthSync,
  desiredDepthPopupStore,
  openDesiredDepthPopup,
  parseDesiredDepthDraft,
  scheduleDesiredDepthSync,
  setDesiredDepthDraft,
  syncDesiredDepthDraft,
};

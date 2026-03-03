import { setupConnectionListener } from '@/tauri/connection';
import { DisposableStack, type CleanupFn } from '@/tauri/core';
import { setupFirmwareListener } from '@/tauri/firmware';
import { setupGamepadListener } from '@/tauri/gamepad';
import { setupLogsListener } from '@/tauri/logs';
import { setupRegulatorListener } from '@/tauri/regulator';
import { setupRovConfigListener } from '@/tauri/rovConfig';
import { setupRovStatusListener } from '@/tauri/rovStatus';
import { setupRovTelemetryListener } from '@/tauri/rovTelemetry';
import { setupToastListener } from '@/tauri/toast';

export { recoverTempRecordings, saveRecording } from '@/tauri/recording';
export { regulatorSuggestions } from '@/tauri/regulator';
export { requestRovConfig, setRovConfig } from '@/tauri/rovConfig';
export { sendDirectionVector } from '@/tauri/directionVector';
export { toggleAutoStabilization, toggleDepthHold } from '@/tauri/stabilization';
export { vibrateGamepad } from '@/tauri/gamepad';

const listeners = [
  setupConnectionListener,
  setupFirmwareListener,
  setupGamepadListener,
  setupLogsListener,
  setupRegulatorListener,
  setupRovConfigListener,
  setupRovStatusListener,
  setupRovTelemetryListener,
  setupToastListener,
];

export const setupAllListeners = async (): Promise<CleanupFn> => {
  const disposables = new DisposableStack();

  const unlisteners = await Promise.all(listeners.map((setup) => setup()));

  unlisteners.forEach((cleanup) => disposables.add(cleanup));

  return disposables.dispose;
};

import { setupConnectionListener } from '@/tauri/connection';
import { DisposableStack, type CleanupFn } from '@/tauri/core';
import { setupGamepadListener } from '@/tauri/gamepad';
import { setupLogsListener } from '@/tauri/logs';
import { setupRegulatorListener } from '@/tauri/regulator';
import { setupRovConfigListener } from '@/tauri/rovConfig';
import { setupRovStatusListener } from '@/tauri/rovStatus';
import { setupRovTelemetryListener } from '@/tauri/rovTelemetry';
import { setupToastListener } from '@/tauri/toast';

export { flashMcuFirmware } from '@/tauri/mcuFirmware';
export { getConfig, setConfig } from '@/tauri/config';
export { setDesiredDepth } from '@/tauri/desiredDepth';
export {
  checkForFirmwareUpdates,
  downloadFirmwareUpdate,
  refreshFirmwareUpdateStatus,
} from '@/tauri/firmwareUpdater';
export { initializeVideoDirectory, recoverTempRecordings, saveRecording } from '@/tauri/recording';
export { regulatorSuggestions, startRegulatorAutoTuning } from '@/tauri/regulator';
export { requestRovConfig, setRovConfig } from '@/tauri/rovConfig';
export { sendDirectionVector } from '@/tauri/directionVector';
export { toggleAutoStabilization, toggleDepthHold } from '@/tauri/stabilization';
export { vibrateGamepad } from '@/tauri/gamepad';
export { checkForAppUpdates, installAppUpdate } from '@/tauri/updater';
export { closeSplashscreen } from '@/tauri/window';

const listeners = [
  setupConnectionListener,
  setupGamepadListener,
  setupLogsListener,
  setupRegulatorListener,
  setupRovConfigListener,
  setupRovStatusListener,
  setupRovTelemetryListener,
  setupToastListener,
];

export const setupAllListeners = (): Promise<CleanupFn> => {
  const disposables = new DisposableStack();

  return Promise.all(listeners.map((setup) => setup())).then((unlisteners) => {
    for (const cleanup of unlisteners) {
      disposables.add(cleanup);
    }

    return () => {
      disposables.dispose();
    };
  });
};

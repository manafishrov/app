import { setRovTelemetryStore, type RovTelemetry } from '@/stores/rovTelemetry';
import { createListener } from '@/tauri/core';

const EVENT = 'rov_telemetry';

export const setupRovTelemetryListener = (): Promise<() => void> =>
  createListener<RovTelemetry>(EVENT, setRovTelemetryStore, { warnOnly: true });

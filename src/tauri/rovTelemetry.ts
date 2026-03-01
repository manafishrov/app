import { setRovTelemetryStore, type RovTelemetry } from '@/stores/rovTelemetry';
import { createListener } from '@/tauri/core';

const EVENT = 'rov_telemetry';

export function setupRovTelemetryListener() {
  return createListener<RovTelemetry>(EVENT, setRovTelemetryStore, { warnOnly: true });
}

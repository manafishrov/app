import { setRovTelemetryStore, type RovTelemetry } from '@/stores/rovTelemetry';
import { createListener } from '@/tauri/core';

const EVENT = 'rov_telemetry';

export const setupRovTelemetryListener = () => createListener<RovTelemetry>(EVENT, setRovTelemetryStore, { warnOnly: true });

import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createListener: vi.fn() }));
vi.mock('@/tauri/core', () => ({ createListener: mocks.createListener }));

import { rovTelemetryStore, type RovTelemetry } from '@/stores/rovTelemetry';
import { setupRovTelemetryListener } from '@/tauri/rovTelemetry';

const TELEMETRY_HZ = 60;
const MILLISECONDS_PER_SECOND = 1000;
const DESIRED_OFFSET = 10;
let receive: (sample: RovTelemetry) => void = () => 0;

it('passes every 60Hz actual and desired sample to the existing overlay store', () => {
  vi.useFakeTimers();
  const unlisten = vi.fn();
  mocks.createListener.mockImplementation(
    (_event: string, listener: typeof receive): Promise<() => void> => {
      receive = listener;
      return Promise.resolve(unlisten);
    },
  );
  return setupRovTelemetryListener()
    .then((cleanup) => {
      expect(mocks.createListener).toHaveBeenCalledWith('rov_telemetry', expect.any(Function), {
        warnOnly: true,
      });
      for (let frame = 1; frame <= TELEMETRY_HZ; frame += 1) {
        const sample: RovTelemetry = {
          ...rovTelemetryStore,
          pitch: frame,
          roll: -frame,
          yaw: frame,
          desiredPitch: frame + DESIRED_OFFSET,
          desiredRoll: -frame - DESIRED_OFFSET,
          desiredYaw: frame + DESIRED_OFFSET,
        };
        receive(sample);
        expect(rovTelemetryStore).toMatchObject(sample);
        vi.advanceTimersByTime(MILLISECONDS_PER_SECOND / TELEMETRY_HZ);
      }
      cleanup();
      expect(unlisten).toHaveBeenCalledOnce();
    })
    .finally(() => {
      vi.useRealTimers();
    });
});

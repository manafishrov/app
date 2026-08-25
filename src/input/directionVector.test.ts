import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DirectionVector } from '@/stores/directionVector';

import {
  createDirectionVectorLoop,
  DIRECTION_VECTOR_SEND_INTERVAL_MS,
  type DirectionVectorConfig,
} from '@/input/directionVector';

const INTERVALS_TO_ADVANCE = 3;
const INITIAL_SEND_COUNT = 1;
const config: DirectionVectorConfig = {
  selectedGamepadId: null,
  gamepad: {},
  keyboard: {
    surgeForward: null,
    surgeBackward: null,
    swayRight: null,
    swayLeft: null,
    heaveUp: null,
    heaveDown: null,
    pitchUp: null,
    pitchDown: null,
    yawRight: null,
    yawLeft: null,
    rollLeft: null,
    rollRight: null,
    action1Positive: null,
    action1Negative: null,
    action2Positive: null,
    action2Negative: null,
    autoStabilization: null,
    depthHold: null,
    desiredDepthEntry: null,
    desiredDepthIncrease: null,
    desiredDepthDecrease: null,
    record: null,
  },
};

describe('createDirectionVectorLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes input on a fixed timer instead of render frames', () => {
    const send = vi.fn<(vector: DirectionVector) => Promise<void>>().mockResolvedValue();
    const cleanup = createDirectionVectorLoop(config, new Set(), send);

    expect(send).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(DIRECTION_VECTOR_SEND_INTERVAL_MS * INTERVALS_TO_ADVANCE);
    expect(send).toHaveBeenCalledTimes(INITIAL_SEND_COUNT + INTERVALS_TO_ADVANCE);

    cleanup();
    expect(send).toHaveBeenLastCalledWith([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('stops publishing after cleanup', () => {
    const send = vi.fn<(vector: DirectionVector) => Promise<void>>().mockResolvedValue();
    const cleanup = createDirectionVectorLoop(config, new Set(), send);
    cleanup();
    const callCount = send.mock.calls.length;

    vi.advanceTimersByTime(DIRECTION_VECTOR_SEND_INTERVAL_MS * INTERVALS_TO_ADVANCE);

    expect(send).toHaveBeenCalledTimes(callCount);
  });
});

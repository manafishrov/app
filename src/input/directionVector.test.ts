import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DirectionVector } from '@/stores/directionVector';

import {
  createDirectionVectorLoop,
  DIRECTION_VECTOR_SEND_INTERVAL_MS,
  type DirectionVectorConfig,
} from '@/input/directionVector';

const INTERVALS_TO_ADVANCE = 3;
const INITIAL_SEND_COUNT = 1;
const SECOND_CALL_INDEX = 1;
const EXPECTED_COALESCED_SEND_COUNT = 2;
const resolverNotInitialized = (): never => {
  throw new Error('Promise resolver was not initialized');
};

const createDeferred = (): { promise: Promise<void>; resolve: () => void } => {
  let resolvePromise: () => void = resolverNotInitialized;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
};
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
    const deactivate = vi.fn<() => Promise<void>>().mockResolvedValue();
    const cleanup = createDirectionVectorLoop(config, new Set(), { deactivate, send });

    expect(send).toHaveBeenCalledTimes(1);
    return vi
      .advanceTimersByTimeAsync(DIRECTION_VECTOR_SEND_INTERVAL_MS)
      .then(() => vi.advanceTimersByTimeAsync(DIRECTION_VECTOR_SEND_INTERVAL_MS))
      .then(() => vi.advanceTimersByTimeAsync(DIRECTION_VECTOR_SEND_INTERVAL_MS))
      .then(() => {
        expect(send).toHaveBeenCalledTimes(INITIAL_SEND_COUNT + INTERVALS_TO_ADVANCE);
        cleanup();
        expect(deactivate).toHaveBeenCalledOnce();
      });
  });

  it('stops publishing after cleanup', () => {
    const send = vi.fn<(vector: DirectionVector) => Promise<void>>().mockResolvedValue();
    const deactivate = vi.fn<() => Promise<void>>().mockResolvedValue();
    const cleanup = createDirectionVectorLoop(config, new Set(), { deactivate, send });
    cleanup();
    const callCount = send.mock.calls.length;

    vi.advanceTimersByTime(DIRECTION_VECTOR_SEND_INTERVAL_MS * INTERVALS_TO_ADVANCE);

    expect(send).toHaveBeenCalledTimes(callCount);
  });
});

describe('pending direction vector transport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps only the latest vector while a transport call is pending', () => {
    const firstSend = createDeferred();
    const send = vi
      .fn<(vector: DirectionVector) => Promise<void>>()
      .mockReturnValueOnce(firstSend.promise)
      .mockResolvedValue();
    const pressedKeys = new Set<string>();
    const boundConfig: DirectionVectorConfig = {
      ...config,
      keyboard: {
        ...config.keyboard,
        surgeForward: { key: 'KeyW', minValue: 0, maxValue: 1 },
      },
    };
    const cleanup = createDirectionVectorLoop(boundConfig, pressedKeys, {
      deactivate: vi.fn<() => Promise<void>>().mockResolvedValue(),
      send,
    });

    pressedKeys.add('KeyW');
    vi.advanceTimersByTime(DIRECTION_VECTOR_SEND_INTERVAL_MS * INTERVALS_TO_ADVANCE);
    expect(send).toHaveBeenCalledOnce();
    firstSend.resolve();

    return vi.advanceTimersByTimeAsync(0).then(() => {
      expect(send).toHaveBeenCalledTimes(EXPECTED_COALESCED_SEND_COUNT);
      const secondCall = send.mock.calls[SECOND_CALL_INDEX];
      if (!secondCall) {
        throw new Error('Latest direction vector was not sent');
      }
      expect(secondCall[0][0]).toBe(1);
      cleanup();
    });
  });
});

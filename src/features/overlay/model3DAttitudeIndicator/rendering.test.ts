// @vitest-environment happy-dom
/* oxlint-disable no-magic-numbers, max-statements, oxc/no-async-await -- ordered rendering lifecycle regression */
import type * as Three from 'three';

import { createResource, createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Group } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { useModel3DAttitudeIndicator } from './Parts';

const renderer = vi.hoisted(() => ({
  setPixelRatio: vi.fn(),
  setSize: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('three', async (importOriginal) => ({
  ...(await importOriginal<typeof Three>()),
  // oxlint-disable-next-line prefer-arrow-callback -- Three constructs the renderer with new
  WebGLRenderer: vi.fn(function MockRenderer() {
    return renderer;
  }),
}));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));

const visibility: { update: (visible: boolean) => void; disconnect: ReturnType<typeof vi.fn> } = {
  update: vi.fn(),
  disconnect: vi.fn(),
};
beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class MockObserver {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        visibility.update = (visible): void => {
          callback([{ isIntersecting: visible }]);
        };
      }
      // oxlint-disable-next-line class-methods-use-this -- matches IntersectionObserver's instance API
      observe = (): void => {
        visibility.update(true);
      };
      disconnect = visibility.disconnect;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.clearAllMocks();
});

it('does not redraw a stationary model between telemetry updates', async () => {
  vi.useFakeTimers();
  const [props, update] = createStore({
    size: 116,
    pitch: 0,
    roll: 0,
    yaw: 0,
    desiredYaw: 0,
    autoStabilization: false,
  });
  const canvas = document.createElement('canvas');
  const dispose = createRoot((cleanup) => {
    const [gltf] = createResource(() => Promise.resolve(new Group()));
    useModel3DAttitudeIndicator(props, gltf, () => canvas);
    return cleanup;
  });
  try {
    await vi.waitFor(() => {
      expect(renderer.render).toHaveBeenCalled();
    });
    const firstRender = renderer.render.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(renderer.render).toHaveBeenCalledTimes(firstRender);
    update('roll', 12);
    expect(renderer.render).toHaveBeenCalledTimes(firstRender + 1);
    visibility.update(false);
    update('size', 164);
    update('roll', 24);
    expect(renderer.render).toHaveBeenCalledTimes(firstRender + 1);
    visibility.update(true);
    expect(renderer.render).toHaveBeenCalledTimes(firstRender + 2);
    expect(renderer.setSize).toHaveBeenLastCalledWith(164, 164);
  } finally {
    dispose();
  }
  expect(renderer.dispose).toHaveBeenCalledOnce();
  expect(visibility.disconnect).toHaveBeenCalledOnce();
});

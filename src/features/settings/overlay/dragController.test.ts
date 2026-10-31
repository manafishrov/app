// @vitest-environment happy-dom
/* oxlint-disable no-magic-numbers, max-statements, typescript/explicit-function-return-type -- test fixtures and event/assertion sequences stay together */
import { createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { OverlayAnchor, OverlayWidgetType, type OverlayWidget } from '@/stores/overlayTypes';

import { createDragController } from './dragController';

const widget: OverlayWidget = {
  id: 'attitude',
  type: OverlayWidgetType.attitudeScientific,
  column: 1,
  row: 1,
  columnSpan: 2,
  rowSpan: 2,
  anchor: OverlayAnchor.topLeft,
  options: {},
};

const setup = () => {
  const canvas = document.createElement('div');
  const handle = document.createElement('div');
  handle.tabIndex = 0;
  canvas.append(handle);
  document.body.append(canvas);
  canvas.getBoundingClientRect = () => new DOMRect(40, 20, 1200, 900);
  const capture = vi.fn();
  const release = vi.fn();
  canvas.setPointerCapture = capture;
  canvas.hasPointerCapture = () => true;
  canvas.releasePointerCapture = release;
  const onMove = vi.fn();
  const onDrop = vi.fn();
  const onSelect = vi.fn();
  const dispose = createRoot((cleanup) => {
    const drag = createDragController({
      canvas: () => canvas,
      grid: () => ({ columns: 12, rows: 9 }),
      onMove,
      onDrop,
      onSelect,
    });
    handle.addEventListener('pointerdown', (event) => {
      drag.onWidgetPointerDown(event, widget);
    });
    canvas.addEventListener('pointermove', drag.onPointerMove);
    canvas.addEventListener('pointerup', drag.onPointerUp);
    return cleanup;
  });
  return {
    canvas,
    capture,
    release,
    handle,
    onMove,
    onDrop,
    onSelect,
    dispose: () => {
      dispose();
      canvas.remove();
    },
  };
};

describe('overlay dragging', () => {
  it('uses camera coordinates and captures on the canvas that receives the drop', () => {
    const test = setup();
    try {
      test.handle.dispatchEvent(
        new PointerEvent('pointerdown', { clientX: 50, clientY: 30, pointerId: 1, bubbles: true }),
      );
      expect(test.capture).toHaveBeenCalledWith(1);
      expect(document.activeElement).toBe(test.handle);
      test.canvas.dispatchEvent(
        new PointerEvent('pointermove', { clientX: 450, clientY: 330, pointerId: 1 }),
      );
      expect(test.onMove).toHaveBeenLastCalledWith('attitude', { column: 5, row: 4 });
      expect(test.onDrop).not.toHaveBeenCalled();
      test.canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      expect(test.release).toHaveBeenCalledWith(1);
      expect(test.onDrop).toHaveBeenCalledTimes(1);
      test.canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 550, clientY: 430 }));
      expect(test.onMove).toHaveBeenCalledTimes(1);
    } finally {
      test.dispose();
    }
  });

  it('preserves the grabbed cell and keeps square widgets within the camera edges', () => {
    const test = setup();
    try {
      test.handle.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: 190,
          clientY: 170,
          pointerId: 1,
          bubbles: true,
        }),
      );
      test.canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 190, clientY: 170 }));
      expect(test.onMove).toHaveBeenLastCalledWith('attitude', { column: 1, row: 1 });
      test.canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 2000, clientY: 2000 }));
      expect(test.onMove).toHaveBeenLastCalledWith('attitude', { column: 11, row: 8 });
    } finally {
      test.dispose();
    }
  });
});

import type { Component } from 'solid-js';

import type { Detection } from '@/tauri/detection';

import { configStore } from '@/stores/config';
import { type DetectionFrame, detectionStore } from '@/stores/detection';

// Results this old mean the stream or inference has stalled.
const STALE_AFTER_MS = 1000;
const STALE_CHECK_INTERVAL_MS = 250;
const LINE_WIDTH = 2;
const FONT_SIZE = 12;
const LABEL_PADDING = 3;
const BOTH_SIDES = 2;
const PERCENT = 100;
const HALF = 0.5;
// Golden-angle hue steps keep neighbouring class IDs visually distinct.
const HUE_STEP = 137.508;
const FULL_TURN = 360;

const colorForClass = (classId: number): string =>
  `hsl(${String(Math.round((classId * HUE_STEP) % FULL_TURN))} 90% 55%)`;

type Rect = { left: number; top: number; width: number; height: number };

/** Where the `object-contain` video is drawn inside the camera frame. */
const containRect = (frame: DetectionFrame, width: number, height: number): Rect => {
  const scale = Math.min(width / frame.frameWidth, height / frame.frameHeight);
  const contentWidth = frame.frameWidth * scale;
  const contentHeight = frame.frameHeight * scale;
  return {
    left: (width - contentWidth) * HALF,
    top: (height - contentHeight) * HALF,
    width: contentWidth,
    height: contentHeight,
  };
};

const labelFor = (detection: Detection): string => {
  const parts: string[] = [];
  if (configStore.detection.showLabels) {
    parts.push(`${detection.label} ${String(Math.round(detection.confidence * PERCENT))}%`);
  }
  if (configStore.detection.showTrackIds) {
    parts.push(`#${String(detection.trackId)}`);
  }
  return parts.join(' ');
};

/** Sizes the backing store to the element and returns its size in CSS pixels. */
const fitCanvas = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): Rect => {
  const ratio = globalThis.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { left: 0, top: 0, width, height };
};

type LabelPlacement = { box: Rect; area: Rect; label: string };

const drawLabel = (
  context: CanvasRenderingContext2D,
  { box, area, label }: LabelPlacement,
): void => {
  const labelWidth = context.measureText(label).width + LABEL_PADDING * BOTH_SIDES;
  const labelHeight = FONT_SIZE + LABEL_PADDING * BOTH_SIDES;
  // Keep the label inside the frame when the box touches its top edge.
  const labelTop = box.top - labelHeight >= area.top ? box.top - labelHeight : box.top;
  const labelLeft = box.left - LINE_WIDTH * HALF;
  context.fillRect(labelLeft, labelTop, labelWidth, labelHeight);
  context.fillStyle = '#000';
  context.fillText(label, labelLeft + LABEL_PADDING, labelTop + LABEL_PADDING);
};

const drawDetection = (
  context: CanvasRenderingContext2D,
  area: Rect,
  detection: Detection,
): void => {
  const box: Rect = {
    left: area.left + detection.left * area.width,
    top: area.top + detection.top * area.height,
    width: detection.width * area.width,
    height: detection.height * area.height,
  };
  const color = colorForClass(detection.classId);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.strokeRect(box.left, box.top, box.width, box.height);
  const label = labelFor(detection);
  if (label !== '') {
    drawLabel(context, { box, area, label });
  }
};

const setStrokeAndText = (context: CanvasRenderingContext2D): void => {
  context.lineWidth = LINE_WIDTH;
  context.font = `600 ${String(FONT_SIZE)}px ui-sans-serif, system-ui, sans-serif`;
  context.textBaseline = 'top';
};

const draw = (canvas: HTMLCanvasElement, frame: DetectionFrame | null): void => {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  const size = fitCanvas(canvas, context);
  if (!frame || Date.now() - frame.capturedAt > STALE_AFTER_MS) {
    return;
  }
  const area = containRect(frame, size.width, size.height);
  setStrokeAndText(context);
  for (const detection of frame.detections) {
    drawDetection(context, area, detection);
  }
};

/** Draws detection boxes over the camera stream. */
const DetectionOverlay: Component = () => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();

  const redraw = (): void => {
    const element = canvas();
    if (element) {
      draw(element, detectionStore.frame);
    }
  };

  // Drawing reads the frame and label settings, so this repaints on any change.
  createEffect(redraw);

  onMount(() => {
    const observer = new ResizeObserver(redraw);
    const element = canvas();
    if (element) {
      observer.observe(element);
    }
    const staleCheck = setInterval(redraw, STALE_CHECK_INTERVAL_MS);
    onCleanup(() => {
      observer.disconnect();
      clearInterval(staleCheck);
    });
  });

  return (
    <canvas
      ref={setCanvas}
      class='pointer-events-none absolute inset-0 h-full w-full'
      aria-hidden='true'
    />
  );
};

export { DetectionOverlay };

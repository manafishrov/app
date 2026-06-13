import { clearCache, layout, prepare, type PreparedText } from '@chenglou/pretext';

import type { LogRecord } from '@/lib/log';

export const PAD_LENGTH_2 = 2;
export const PAD_LENGTH_3 = 3;
export const PAD_LENGTH_4 = 4;

// Row metrics mirror VirtualLogRow CSS (font-mono text-[13px] leading-relaxed, px-4 py-1.5) so canvas measurement matches the rendered DOM. A named font keeps canvas and CSS aligned.
const ROW_FONT_SIZE = 13;
const ROW_FONT = `${ROW_FONT_SIZE}px monospace`;

// 13px times ~1.625 (leading-relaxed), rounded.
const ROW_LINE_HEIGHT = 21;

// `px-4` contributes 16px on each side.
const ROW_PADDING_X = 16;

// `py-1.5` contributes 6px top plus 6px bottom.
const ROW_VERTICAL_PADDING = 12;

// Reserve space for the vertical scrollbar so wrapping matches the real width.
const SCROLLBAR_ALLOWANCE = 12;

// Approximate monospace glyph advance as a fraction of the font size, used only for the no-canvas fallback estimate.
const MONO_CHAR_WIDTH_RATIO = 0.6;

// Initial guess before the viewport width is known. Estimating slightly large gives the virtualizer more accurate initial scroll positions.
export const ROW_ESTIMATE = ROW_LINE_HEIGHT + ROW_VERTICAL_PADDING;

const supportsCanvasMeasurement = 'Segmenter' in Intl && 'OffscreenCanvas' in globalThis;

const preparedCache = new Map<string, PreparedText>();

export const formatTimestamp = (date: Date): string => {
  const dateObj = new Date(date);
  const year = String(dateObj.getFullYear()).padStart(PAD_LENGTH_4, '0');
  const month = String(dateObj.getMonth() + 1).padStart(PAD_LENGTH_2, '0');
  const day = String(dateObj.getDate()).padStart(PAD_LENGTH_2, '0');
  const hours = String(dateObj.getHours()).padStart(PAD_LENGTH_2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(PAD_LENGTH_2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(PAD_LENGTH_2, '0');
  const milliseconds = String(dateObj.getMilliseconds()).padStart(PAD_LENGTH_3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

const getPrepared = (key: string, text: string): PreparedText => {
  const cached = preparedCache.get(key);
  if (cached) {
    return cached;
  }

  const prepared = prepare(text, ROW_FONT, { whiteSpace: 'pre-wrap' });
  preparedCache.set(key, prepared);
  return prepared;
};

// The row renders as one wrapping line `timestamp LEVEL ORIGIN message`; feed the full visible string to pretext so wrapped height accounts for the prefix as well as the body.
const buildRowText = (log: LogRecord): string =>
  `${formatTimestamp(log.timestamp)} ${log.level.toUpperCase()} ${log.origin.toUpperCase()} ${log.message}`;

const rowKey = (log: LogRecord): string =>
  `${log.id}:${log.timestamp.getTime()}:${log.level}:${log.origin}`;

// Rough monospace estimate when canvas measurement is unavailable.
const fallbackRowHeight = (text: string, contentWidth: number): number => {
  const charsPerLine = Math.max(
    1,
    Math.floor(contentWidth / (ROW_FONT_SIZE * MONO_CHAR_WIDTH_RATIO)),
  );
  const lineCount = Math.max(1, Math.ceil(text.length / charsPerLine));
  return lineCount * ROW_LINE_HEIGHT + ROW_VERTICAL_PADDING;
};

export const estimateRowHeight = (log: LogRecord, viewportWidth: number): number => {
  const contentWidth = Math.max(
    1,
    viewportWidth - ROW_PADDING_X * PAD_LENGTH_2 - SCROLLBAR_ALLOWANCE,
  );
  const text = buildRowText(log);

  if (!supportsCanvasMeasurement) {
    return fallbackRowHeight(text, contentWidth);
  }

  const { height } = layout(getPrepared(rowKey(log), text), contentWidth, ROW_LINE_HEIGHT);
  const textHeight = Math.max(ROW_LINE_HEIGHT, height);
  return Math.ceil(textHeight + ROW_VERTICAL_PADDING);
};

// Drop cached measurements; call after fonts load so the next estimate uses final font metrics rather than fallback fonts.
export const resetMeasurementCache = (): void => {
  preparedCache.clear();
  clearCache();
};

export const isNearBottom = (el: HTMLDivElement): boolean => {
  const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
  return distanceToBottom < ROW_ESTIMATE;
};

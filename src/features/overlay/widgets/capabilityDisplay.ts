import type { OverlayWidgetOptions } from '@/stores/overlayTypes';

import * as m from '@/paraglide/messages';

export type CapabilityDisplay = NonNullable<OverlayWidgetOptions['display']>;

export const readingDisplays = (
  valueType: string,
): readonly [CapabilityDisplay, ...CapabilityDisplay[]] => {
  if (valueType === 'boolean') {
    return ['status', 'warningYellow', 'warningRed', 'ping'];
  }
  if (valueType === 'number') {
    return ['text', 'bar', 'verticalBar', 'status'];
  }
  if (valueType === 'numberArray') {
    return ['array', 'text'];
  }
  return ['text', 'badge'];
};

export const compatibleReadingDisplay = (
  valueType: string,
  requested: string | undefined,
): CapabilityDisplay => {
  const displays = readingDisplays(valueType);
  return displays.find((display) => display === requested) ?? displays[0];
};

export const normalisedLevel = (value: unknown, options: OverlayWidgetOptions): number => {
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  const minimum = options.minimum ?? 0;
  const maximum = options.maximum ?? 1;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    maximum <= minimum
  ) {
    return 0;
  }
  return Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum)));
};

const LARGE_VALUE = 100;
const MEDIUM_VALUE = 10;
const SMALL_PRECISION = 2;

export const formatUnit = (unit: string | null | undefined): string => {
  if (typeof unit !== 'string' || unit === '') {
    return '';
  }
  return `${/^\p{L}/u.test(unit) ? ' ' : ''}${unit}`;
};

const precision = (magnitude: number): number => {
  if (magnitude >= LARGE_VALUE) {
    return 0;
  }
  return magnitude >= MEDIUM_VALUE ? 1 : SMALL_PRECISION;
};

export const formatReading = (value: unknown, unit?: string | null): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return (
      new Intl.NumberFormat([], { maximumFractionDigits: precision(Math.abs(value)) }).format(
        value,
      ) + formatUnit(unit)
    );
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => formatReading(item)).join(' · ') + formatUnit(unit);
  }
  if (typeof value === 'boolean') {
    return value ? m.capability_on() : m.capability_off();
  }
  return typeof value === 'string' ? value : '—';
};

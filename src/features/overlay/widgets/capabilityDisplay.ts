import type { OverlayWidgetOptions } from '@/stores/overlayTypes';

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

const [undef] = [] as undefined[];

export const formatReading = (value: unknown): string => {
  if (typeof value === 'number') {
    return new Intl.NumberFormat(undef, { maximumFractionDigits: 3 }).format(value);
  }
  return typeof value === 'string' || typeof value === 'boolean' ? String(value) : '—';
};

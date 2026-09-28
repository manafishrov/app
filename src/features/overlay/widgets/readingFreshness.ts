import type { Accessor } from 'solid-js';

import * as m from '@/paraglide/messages';
import { capabilityStore, type ReadingDescriptor, type ReadingSample } from '@/stores/capabilities';
import { isCapabilityAvailable } from '@/stores/capabilityAvailability';

const SECOND_MS = 1000;
const MINUTE_SECONDS = 60;
const HOUR_SECONDS = 3600;
export type ReadingState = 'ready' | 'stale' | 'failed' | 'empty' | 'unavailable';

export const readingAgeMs = (sample: ReadingSample, receivedAt: number, now: number): number =>
  (sample.ageMs ?? 0) + Math.max(0, now - receivedAt);

export const readingAgeLabel = (ageMs: number): string => {
  const seconds = Math.floor(ageMs / SECOND_MS);
  if (seconds < 1) {
    return m.capability_just_now();
  }
  if (seconds < MINUTE_SECONDS) {
    return m.capability_age_seconds({ seconds });
  }
  if (seconds < HOUR_SECONDS) {
    return m.capability_age_minutes({ minutes: Math.floor(seconds / MINUTE_SECONDS) });
  }
  return m.capability_age_hours({ hours: Math.floor(seconds / HOUR_SECONDS) });
};

export const readingState = (
  descriptor: ReadingDescriptor | undefined,
  sample: ReadingSample | undefined,
  ageMs: number,
): ReadingState => {
  const extension =
    descriptor &&
    capabilityStore.catalog.extensions.find((item) => item.id === descriptor.extensionId);
  if (extension && extension.status === 'error') {
    return 'failed';
  }
  if (!isCapabilityAvailable(descriptor) || (sample && sample.value === null)) {
    return 'unavailable';
  }
  if (!sample) {
    return 'empty';
  }
  return descriptor &&
    typeof descriptor.staleAfterMs === 'number' &&
    ageMs >= descriptor.staleAfterMs
    ? 'stale'
    : 'ready';
};

export const readingStateLabel = (state: ReadingState): string => {
  switch (state) {
    case 'stale': {
      return m.capability_stale();
    }
    case 'failed': {
      return m.capability_failed();
    }
    case 'empty': {
      return m.capability_no_data();
    }
    case 'ready': {
      return '';
    }
    case 'unavailable': {
      return m.capability_unavailable();
    }
    default: {
      return m.capability_unavailable();
    }
  }
};

const scheduleFreshness = (expiresIn: number | null, update: () => void): (() => void) => {
  const interval = setInterval(update, SECOND_MS);
  const timeout = expiresIn === null ? null : setTimeout(update, Math.ceil(expiresIn));
  return (): void => {
    clearInterval(interval);
    if (timeout !== null) {
      clearTimeout(timeout);
    }
  };
};

export const useReadingFreshness = (
  descriptor: Accessor<ReadingDescriptor | undefined>,
  sample: Accessor<ReadingSample | undefined>,
  preview: Accessor<boolean>,
): { age: Accessor<string>; state: Accessor<ReadingState> } => {
  const [now, setNow] = createSignal(performance.now());
  createEffect(() => {
    const current = sample();
    if (!current || current.value === null || preview()) {
      return;
    }
    const receivedAt = capabilityStore.receivedAt[current.id] ?? performance.now();
    const update = (): void => {
      setNow(performance.now());
    };
    update();
    const timeout = (descriptor() ?? {}).staleAfterMs;
    const elapsed = readingAgeMs(current, receivedAt, performance.now());
    const expiresIn = typeof timeout === 'number' ? Math.max(0, timeout - elapsed) : null;
    onCleanup(scheduleFreshness(expiresIn, update));
  });
  const ageMs = (): number => {
    const current = sample();
    return current
      ? readingAgeMs(current, capabilityStore.receivedAt[current.id] ?? now(), now())
      : 0;
  };
  return {
    age: (): string => {
      const current = sample();
      return current && current.value !== null && !preview() ? readingAgeLabel(ageMs()) : '';
    },
    state: (): ReadingState => readingState(descriptor(), sample(), ageMs()),
  };
};

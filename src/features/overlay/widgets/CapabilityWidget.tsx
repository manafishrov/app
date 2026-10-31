import type { Component } from 'solid-js';

import WarningIcon from '~icons/material-symbols/warning';

import type { OverlayWidget } from '@/stores/overlayTypes';

import { useIsOverlayPreview } from '@/features/overlay/OverlayPreview';
import { capabilityStore, type ReadingDescriptor, type ReadingSample } from '@/stores/capabilities';

import { ActionWidget } from './ActionWidget';
import { compatibleReadingDisplay, formatReading, normalisedLevel } from './capabilityDisplay';
import { readingStateLabel, useReadingFreshness } from './readingFreshness';

const SECOND_MS = 1000;
const DEFAULT_DECAY = 0.5;
const PERCENT = 100;
const INACTIVE_OPACITY = 0.25;

const usePing = (props: { widget: OverlayWidget }): (() => boolean) => {
  const [active, setActive] = createSignal(false);
  createEffect(() => {
    const sample = capabilityStore.samples[props.widget.options.sourceId ?? ''];
    const sequence = sample ? sample.sequence : 0;
    if (
      props.widget.options.display !== 'ping' ||
      !sample ||
      sample.value !== true ||
      sequence < 0
    ) {
      setActive(false);
      return;
    }
    setActive(true);
    const duration = Math.max(0, props.widget.options.decaySeconds ?? DEFAULT_DECAY);
    const timer = setTimeout(() => setActive(false), duration * SECOND_MS);
    onCleanup(() => {
      clearTimeout(timer);
    });
  });
  return active;
};

const ReadingValue: Component<{ widget: OverlayWidget; value: unknown; valueType: string }> = (
  props,
) => {
  const ping = usePing(props);
  const display = (): string =>
    compatibleReadingDisplay(props.valueType, props.widget.options.display);
  const level = (): number => normalisedLevel(props.value, props.widget.options);
  const warning = (): boolean => display().startsWith('warning');
  const light = (): boolean => ['status', 'ping'].includes(display()) || warning();
  return (
    <Switch fallback={<span class='overlay-value truncate'>{formatReading(props.value)}</span>}>
      <Match when={light()}>
        <span
          class='overlay-capability-light'
          data-warning={display()}
          data-active={display() === 'ping' ? ping() : level() > 0}
          style={{
            opacity:
              INACTIVE_OPACITY +
              (1 - INACTIVE_OPACITY) * (display() === 'ping' ? Number(ping()) : level()),
          }}
        >
          <Show when={warning()} fallback={<span class='block size-4 rounded-full bg-current' />}>
            <WarningIcon class='size-5' />
          </Show>
        </span>
      </Match>
      <Match when={display() === 'bar' || display() === 'verticalBar'}>
        <span
          class='overlay-capability-bar'
          data-vertical={display() === 'verticalBar'}
          role='meter'
          aria-valuenow={level()}
          aria-valuemin={0}
          aria-valuemax={1}
          aria-label={props.widget.options.label}
        >
          <span
            style={
              display() === 'verticalBar'
                ? { height: `${level() * PERCENT}%` }
                : { width: `${level() * PERCENT}%` }
            }
          />
        </span>
      </Match>
    </Switch>
  );
};

const previewValue = (reading: ReadingDescriptor | undefined): unknown => {
  if (reading && reading.valueType === 'boolean') {
    return true;
  }
  return reading && reading.valueType === 'number' ? DEFAULT_DECAY : '—';
};

export const CapabilityWidget: Component<{ widget: OverlayWidget }> = (props) => {
  const sample = (): ReadingSample | undefined =>
    capabilityStore.samples[props.widget.options.sourceId ?? ''];
  const descriptor = (): ReadingDescriptor | undefined =>
    capabilityStore.catalog.readings.find(
      (reading) => reading.id === props.widget.options.sourceId,
    );
  const preview = useIsOverlayPreview();
  const value = (): unknown => {
    const current = sample();
    return current && current.value !== null ? current.value : previewValue(descriptor());
  };
  const freshness = useReadingFreshness(descriptor, sample, preview);
  const label = (): string => props.widget.options.label ?? props.widget.options.sourceId ?? '';
  const caption = (): string => [label(), freshness.age()].filter(Boolean).join(' · ');
  return (
    <Show
      when={props.widget.options.sourceKind !== 'action'}
      fallback={<ActionWidget widget={props.widget} />}
    >
      <div
        class='overlay-surface overlay-capability'
        data-badge={props.widget.options.display === 'badge'}
        data-state={preview() ? 'preview' : freshness.state()}
        title={caption()}
      >
        <Show
          when={freshness.state() === 'ready' || preview()}
          fallback={<span class='overlay-label'>{readingStateLabel(freshness.state())}</span>}
        >
          <ReadingValue widget={props.widget} value={value()} valueType={typeof value()} />
        </Show>
        <span class='overlay-label truncate'>{caption()}</span>
      </div>
    </Show>
  );
};

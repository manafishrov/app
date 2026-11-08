import type { Component } from 'solid-js';

import WarningIcon from '~icons/material-symbols/warning';

import type { OverlayWidget } from '@/stores/overlayTypes';

import { useIsOverlayPreview } from '@/features/overlay/OverlayPreview';
import { capabilityStore, type ReadingDescriptor, type ReadingSample } from '@/stores/capabilities';

import { ActionWidget } from './ActionWidget';
import {
  compatibleReadingDisplay,
  formatReading,
  formatUnit,
  normalisedLevel,
} from './capabilityDisplay';
import { readingStateLabel, useReadingFreshness } from './readingFreshness';

const SECOND_MS = 1000;
const DEFAULT_DECAY = 0.5;
const PERCENT = 100;
const INACTIVE_OPACITY = 0.25;
const ARRAY_CELLS = 8;

const usePing = (props: { widget: OverlayWidget }): (() => boolean) => {
  const [active, setActive] = createSignal(false);
  createEffect(() => {
    const sample = capabilityStore.samples[props.widget.options.sourceId ?? ''];
    if (
      props.widget.options.display !== 'ping' ||
      !sample ||
      sample.value !== true ||
      sample.sequence < 0
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

type ValueProps = {
  widget: OverlayWidget;
  value: unknown;
  display: string;
  unit: string | null | undefined;
};
const ReadingBar: Component<ValueProps> = (props) => {
  const bar = (): boolean => ['bar', 'verticalBar'].includes(props.display);
  const level = (): number => normalisedLevel(props.value, props.widget.options);
  return (
    <Show when={bar()}>
      <span
        class='overlay-capability-bar'
        data-vertical={props.display === 'verticalBar'}
        role='meter'
        aria-valuenow={level()}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-label={props.widget.options.label}
      >
        <span
          style={
            props.display === 'verticalBar'
              ? { height: `${level() * PERCENT}%` }
              : { width: `${level() * PERCENT}%` }
          }
        />
      </span>
    </Show>
  );
};

const ReadingValue: Component<ValueProps> = (props) => {
  const ping = usePing(props);
  const level = (): number => normalisedLevel(props.value, props.widget.options);
  const warning = (): boolean => props.display.startsWith('warning');
  const light = (): boolean => ['status', 'ping'].includes(props.display) || warning();
  return (
    <>
      <Show when={light()}>
        <span
          class='overlay-capability-light'
          data-warning={props.display}
          data-active={props.display === 'ping' ? ping() : level() > 0}
          style={{
            opacity:
              INACTIVE_OPACITY +
              (1 - INACTIVE_OPACITY) * (props.display === 'ping' ? Number(ping()) : level()),
          }}
        >
          <Show when={warning()} fallback={<span class='block size-2 rounded-full bg-current' />}>
            <WarningIcon class='size-3' />
          </Show>
        </span>
      </Show>
      <span class='overlay-value' data-text={typeof props.value === 'string'}>
        {formatReading(props.value)}
        <Show when={typeof props.value === 'number'}>
          <span class='overlay-unit'>{formatUnit(props.unit)}</span>
        </Show>
      </span>
      <ReadingBar {...props} />
    </>
  );
};

const ArrayReading: Component<{ value: unknown }> = (props) => {
  const items = (): unknown[] => (Array.isArray(props.value) ? props.value : []);
  const visible = (): unknown[] =>
    items().slice(0, items().length > ARRAY_CELLS ? ARRAY_CELLS - 1 : ARRAY_CELLS);
  return (
    <div class='overlay-array-values'>
      <For each={visible()}>
        {(value, index) => (
          <span class='overlay-array-cell'>
            <span class='overlay-label'>{index() + 1}</span>
            <span class='overlay-value'>{formatReading(value)}</span>
          </span>
        )}
      </For>
      <Show when={items().length > ARRAY_CELLS}>
        <span class='overlay-array-cell overlay-label'>+{items().length - visible().length}</span>
      </Show>
    </div>
  );
};

const previewValue = (reading: ReadingDescriptor | undefined): unknown => {
  if (reading && reading.valueType === 'boolean') {
    return true;
  }
  if (reading && reading.valueType === 'numberArray') {
    return [0, 0, 0, 0];
  }
  return reading && reading.valueType === 'number' ? DEFAULT_DECAY : '—';
};

type CapabilityReadingModel = {
  value: () => unknown;
  unit: () => string | null | undefined;
  display: () => string;
  freshness: ReturnType<typeof useReadingFreshness>;
  ready: () => boolean;
  label: () => string;
  title: () => string;
};

const useCapabilityReading = (
  props: { widget: OverlayWidget },
  preview: () => boolean,
): CapabilityReadingModel => {
  const sample = (): ReadingSample | undefined =>
    capabilityStore.samples[props.widget.options.sourceId ?? ''];
  const descriptor = (): ReadingDescriptor | undefined =>
    capabilityStore.catalog.readings.find(
      (reading) => reading.id === props.widget.options.sourceId,
    );
  const value = (): unknown => {
    const current = sample();
    return current ? current.value : previewValue(descriptor());
  };
  const unit = (): string | null | undefined => {
    const reading = descriptor();
    return reading ? reading.unit : null;
  };
  const display = (): string => {
    const reading = descriptor();
    return compatibleReadingDisplay(
      reading ? reading.valueType : typeof value(),
      props.widget.options.display,
    );
  };
  const freshness = useReadingFreshness(descriptor, sample, preview);
  const ready = (): boolean =>
    freshness.state() === 'ready' || (preview() && !sample() && Boolean(descriptor()));
  const label = (): string => {
    const reading = descriptor();
    return (
      props.widget.options.label ?? (reading ? reading.name : (props.widget.options.sourceId ?? ''))
    );
  };
  const title = (): string =>
    [
      label(),
      ready() ? formatReading(value(), unit()) : readingStateLabel(freshness.state()),
      freshness.age(),
    ]
      .filter(Boolean)
      .join(' · ');
  return { value, unit, display, freshness, ready, label, title };
};

export const CapabilityWidget: Component<{ widget: OverlayWidget }> = (props) => {
  const preview = useIsOverlayPreview();
  const reading = useCapabilityReading(props, preview);
  return (
    <Show
      when={props.widget.options.sourceKind !== 'action'}
      fallback={<ActionWidget widget={props.widget} />}
    >
      <div
        class='overlay-surface overlay-capability'
        data-display={reading.display()}
        data-state={preview() ? 'preview' : reading.freshness.state()}
        title={reading.title()}
      >
        <span class='overlay-label' title={reading.label()}>
          {reading.label()}
        </span>
        <Show
          when={reading.ready()}
          fallback={
            <span class='overlay-label overlay-reading-state'>
              {readingStateLabel(reading.freshness.state())}
            </span>
          }
        >
          <Show
            when={reading.display() === 'array'}
            fallback={
              <ReadingValue
                widget={props.widget}
                value={reading.value()}
                display={reading.display()}
                unit={reading.unit()}
              />
            }
          >
            <span class='overlay-unit'>{reading.unit()}</span>
            <ArrayReading value={reading.value()} />
          </Show>
        </Show>
      </div>
    </Show>
  );
};

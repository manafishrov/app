import type { Component } from 'solid-js';

import { H3 } from '@manafishrov/ui/typography';

import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { type DetectionStats, detectionStore } from '@/stores/detection';

const runStateLabel = (): string => {
  switch (detectionStore.state) {
    case 'loading': {
      return m.detection_status_loading();
    }
    case 'connecting': {
      return m.detection_status_connecting();
    }
    case 'running': {
      return m.detection_status_running();
    }
    case 'error': {
      return m.detection_status_error();
    }
    case 'stopped': {
      return m.detection_status_starting();
    }
    default: {
      return m.detection_status_starting();
    }
  }
};

const stateLabel = (): string => {
  if (!configStore.detection.enabled) {
    return m.detection_status_disabled();
  }
  if (configStore.detection.modelId === null) {
    return m.detection_status_no_model();
  }
  return runStateLabel();
};

const providerLabel = (): string => {
  switch (detectionStore.executionProvider) {
    case 'coreMl': {
      return 'Core ML';
    }
    case 'directMl': {
      return 'DirectML';
    }
    case 'cuda': {
      return 'NVIDIA CUDA';
    }
    case 'migraphx': {
      return 'AMD MIGraphX (ROCm)';
    }
    case 'openVino': {
      return 'Intel GPU (OpenVINO)';
    }
    case 'cpu': {
      return m.detection_hardware_cpu();
    }
    case null: {
      return m.common_not_available();
    }
    default: {
      return m.common_not_available();
    }
  }
};

const formatStat = (key: keyof DetectionStats, unit: string): string => {
  const { stats } = detectionStore;
  return stats === null ? m.common_not_available() : `${stats[key].toFixed(1)} ${unit}`;
};

const StatusRow: Component<{ label: string; value: string }> = (props) => (
  <div class='flex justify-between gap-4 py-1.5 text-sm'>
    <dt class='text-muted-foreground'>{props.label}</dt>
    <dd class='text-right font-medium tabular-nums'>{props.value}</dd>
  </div>
);

const showsMessage = (): boolean =>
  detectionStore.message !== null &&
  (detectionStore.state === 'error' || detectionStore.state === 'connecting');

export const DetectionStatus: Component = () => (
  <section class='flex flex-col gap-3'>
    <H3>{m.detection_status_title()}</H3>
    <dl class='divide-y rounded-lg border px-3'>
      <StatusRow label={m.detection_status_state()} value={stateLabel()} />
      <StatusRow label={m.detection_status_hardware()} value={providerLabel()} />
      <StatusRow label={m.detection_status_rate()} value={formatStat('inferenceFps', 'fps')} />
      <StatusRow
        label={m.detection_status_inference_time()}
        value={formatStat('inferenceMs', 'ms')}
      />
      <StatusRow label={m.detection_status_delay()} value={formatStat('latencyMs', 'ms')} />
      <Show when={showsMessage()}>
        <p class='py-2 text-sm break-words text-muted-foreground'>{detectionStore.message}</p>
      </Show>
    </dl>
  </section>
);

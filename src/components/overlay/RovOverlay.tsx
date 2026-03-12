import type { Component, JSX } from 'solid-js';

import { createMemo } from 'solid-js';

import { AttitudeIndicator } from '@/components/overlay/AttitudeIndicator';
import { BatteryIndicator } from '@/components/overlay/BatteryIndicator';
import { ConnectionStatusIndicator } from '@/components/overlay/ConnectionStatusIndicator';
import { DepthIndicator } from '@/components/overlay/DepthIndicator';
import { RecordingIndicator } from '@/components/overlay/RecordingIndicator';
import { StabilizationIndicator } from '@/components/overlay/StabilizationIndicator';
import { TemperatureIndicator } from '@/components/overlay/TemperatureIndicator';
import { ThrusterRpmOverlay } from '@/components/overlay/ThrusterRpmOverlay';
import { configStore } from '@/stores/config';

type ScaledSectionProps = {
  class: string;
  children: JSX.Element;
  scale: number;
};

const ScaledSection: Component<ScaledSectionProps> = (props) => (
  <div
    class={props.class}
    style={{
      zoom: props.scale,
    }}
  >
    {props.children}
  </div>
);

const RovOverlay: Component = () => {
  // Smaller increments and smaller max scale: 1 -> 0.9, 5 -> 1.3
  const scaleMultiplier = createMemo(() => 0.8 + configStore.overlayScale * 0.1);

  return (
    <div class='absolute inset-0 pointer-events-none overflow-hidden'>
      <ScaledSection
        class='absolute top-4 left-4 flex flex-col gap-2'
        scale={scaleMultiplier()}
      >
        <ConnectionStatusIndicator />
        <RecordingIndicator />
      </ScaledSection>
      <ScaledSection
        class='absolute bottom-4 left-4'
        scale={scaleMultiplier()}
      >
        <AttitudeIndicator />
      </ScaledSection>
      <ScaledSection
        class='absolute top-1/2 left-4 -translate-y-1/2'
        scale={scaleMultiplier()}
      >
        <StabilizationIndicator />
      </ScaledSection>
      <ScaledSection
        class='absolute top-1/2 right-4 -translate-y-1/2'
        scale={scaleMultiplier()}
      >
        <ThrusterRpmOverlay />
      </ScaledSection>
      <ScaledSection
        class='absolute right-4 bottom-4 flex flex-row gap-4 items-end'
        scale={scaleMultiplier()}
      >
        <DepthIndicator />
        <TemperatureIndicator />
        <BatteryIndicator />
      </ScaledSection>
    </div>
  );
};

export { RovOverlay };

import type { Component, JSXElement } from 'solid-js';

import { configStore } from '@/stores/config';

import { AttitudeIndicator } from './AttitudeIndicator';
import { BatteryIndicator } from './BatteryIndicator';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { DepthIndicator } from './DepthIndicator';
import { RecordingIndicator } from './RecordingIndicator';
import { StabilizationIndicator } from './StabilizationIndicator';
import { TemperatureIndicator } from './TemperatureIndicator';
import { ThrusterRpmOverlay } from './ThrusterRpmOverlay';
import { UpdateAlert } from './UpdateAlert';

type ScaledSectionProps = {
  class: string;
  children: JSXElement;
  scale: number;
};

const SCALE_BASE = 0.8;
const SCALE_INCREMENT = 0.2;

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

const Overlay: Component = () => {
  const scaleMultiplier = createMemo(() => SCALE_BASE + configStore.overlayScale * SCALE_INCREMENT);

  return (
    <div class='absolute inset-0 pointer-events-none overflow-hidden'>
      <ScaledSection class='absolute top-4 left-4 flex flex-col gap-2' scale={scaleMultiplier()}>
        <ConnectionStatusIndicator />
        <RecordingIndicator />
      </ScaledSection>
      <ScaledSection class='absolute bottom-4 left-4' scale={scaleMultiplier()}>
        <AttitudeIndicator />
      </ScaledSection>
      <ScaledSection class='absolute top-1/2 left-4 -translate-y-1/2' scale={scaleMultiplier()}>
        <StabilizationIndicator />
      </ScaledSection>
      <ScaledSection class='absolute top-1/2 right-4 -translate-y-1/2' scale={scaleMultiplier()}>
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
      <UpdateAlert />
    </div>
  );
};

export { Overlay };

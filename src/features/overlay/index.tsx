import type { Component, JSXElement } from 'solid-js';

import { configStore } from '@/stores/config';

import { AttitudeIndicator } from './AttitudeIndicator';
import { BatteryIndicator } from './BatteryIndicator';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { DepthIndicator } from './DepthIndicator';
import { PiUndervoltageWarning } from './PiUndervoltageWarning';
import { RecordingIndicator } from './RecordingIndicator';
import { StabilizationIndicator } from './StabilizationIndicator';
import { TemperatureIndicator } from './TemperatureIndicator';
import { ThrusterRpmOverlay } from './ThrusterRpmOverlay';

type ScaledContentProps = {
  class?: string;
  children: JSXElement;
  scale: number;
};

const SCALE_BASE = 0.65;
const SCALE_INCREMENT = 0.35;

const ZoomContent: Component<ScaledContentProps> = (props) => (
  <div class={props.class} style={{ zoom: props.scale }}>
    {props.children}
  </div>
);

const Overlay: Component = () => {
  const scaleMultiplier = createMemo(() => SCALE_BASE + configStore.overlayScale * SCALE_INCREMENT);

  return (
    <div class='pointer-events-none absolute inset-0 overflow-hidden'>
      <PiUndervoltageWarning />
      <div class='absolute top-4 left-4'>
        <ZoomContent class='flex flex-col gap-2' scale={scaleMultiplier()}>
          <ConnectionStatusIndicator />
          <RecordingIndicator />
        </ZoomContent>
      </div>

      <div class='absolute inset-y-0 left-4 flex items-end pb-4'>
        <ZoomContent scale={scaleMultiplier()}>
          <AttitudeIndicator />
        </ZoomContent>
      </div>

      <div class='absolute inset-y-0 left-4 flex items-center'>
        <StabilizationIndicator />
      </div>

      <div class='absolute inset-y-0 right-4 flex items-center justify-end'>
        <ZoomContent scale={scaleMultiplier()}>
          <ThrusterRpmOverlay />
        </ZoomContent>
      </div>

      <div class='absolute inset-x-0 bottom-4 flex items-end justify-end pr-4'>
        <ZoomContent class='flex flex-row items-end gap-4' scale={scaleMultiplier()}>
          <DepthIndicator />
          <TemperatureIndicator />
          <BatteryIndicator />
        </ZoomContent>
      </div>
    </div>
  );
};

export { Overlay };

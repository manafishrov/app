import type { Component } from 'solid-js';

import { ThrusterRpm } from '@/components/ThrusterRpm';
import { rovConfigStore } from '@/stores/rovConfig';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

import { useOverlayContentVisible } from './OverlayPreview';
import { thrusterRpmFor } from './thrusterRpm';

const ThrusterRpmOverlay: Component<{ index: number }> = (props) => {
  const isVisible = useOverlayContentVisible();

  return (
    <div class={isVisible() ? 'overlay-surface overlay-readings' : 'hidden'}>
      <span class='overlay-reading'>
        <span class='text-muted-foreground'>T{props.index + 1}</span>
        <span class='overlay-value inline-flex items-center gap-1'>
          <ThrusterRpm
            rpm={thrusterRpmFor(
              props.index,
              rovConfigStore.thrusterPinSetup.identifiers,
              rovTelemetryStore.thrusterRpms,
            )}
          />
        </span>
      </span>
    </div>
  );
};

export { ThrusterRpmOverlay };

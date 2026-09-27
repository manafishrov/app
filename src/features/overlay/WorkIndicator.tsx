import type { Component } from 'solid-js';

import * as m from '@/paraglide/messages';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

import { useOverlayContentVisible } from './OverlayPreview';

const MAX_PERCENTAGE = 100;
const GREEN_HUE = 120;

const WorkIndicator: Component = () => {
  const isVisible = useOverlayContentVisible();
  const percentage = (): number =>
    Math.min(MAX_PERCENTAGE, Math.max(0, rovTelemetryStore.workIndicatorPercentage));
  return (
    <div
      class={isVisible() ? 'overlay-surface overlay-reading relative overflow-hidden' : 'hidden'}
      role='meter'
      aria-label={m.overlay_widget_work_indicator()}
      aria-valuemin={0}
      aria-valuemax={MAX_PERCENTAGE}
      aria-valuenow={percentage()}
    >
      <span class='overlay-label'>{m.overlay_work_short()}</span>
      <span class='overlay-value'>{percentage().toFixed(0)}%</span>
      <span
        class='pointer-events-none absolute bottom-0 left-0 h-0.5'
        style={{
          width: `${percentage()}%`,
          'background-color': `hsl(${GREEN_HUE * (1 - percentage() / MAX_PERCENTAGE)} 70% 45%)`,
        }}
      />
    </div>
  );
};

export { WorkIndicator };

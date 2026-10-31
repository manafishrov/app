import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import ThermometerIcon from '~icons/material-symbols/device-thermostat';
import CircuitIcon from '~icons/material-symbols/memory';
import WaterIcon from '~icons/material-symbols/water-drop';

import * as m from '@/paraglide/messages';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

import { useOverlayContentVisible } from './OverlayPreview';

const ELECTRONICS_TEMP_WARN = 80;
const ELECTRONICS_TEMP_CRITICAL = 90;

const isElectronicsTempCritical = (temp: number): boolean => temp >= ELECTRONICS_TEMP_CRITICAL;
const isElectronicsTempWarn = (temp: number): boolean =>
  temp >= ELECTRONICS_TEMP_WARN && temp < ELECTRONICS_TEMP_CRITICAL;

const temperatureValueClass = (): string =>
  `overlay-value ${isElectronicsTempWarn(rovTelemetryStore.electronicsTemperature) ? 'text-yellow-500' : ''}`;

const TemperatureIndicator: Component<{ electronics: boolean }> = (props) => {
  const isVisible = useOverlayContentVisible();

  return (
    <div class={isVisible() ? 'overlay-surface overlay-readings' : 'hidden'}>
      <Show when={!props.electronics}>
        <Badge variant='secondary' class='overlay-reading'>
          <div class='flex shrink-0 items-center text-muted-foreground'>
            <div class='relative mr-1 flex items-center'>
              <ThermometerIcon class='-ml-1 size-[1em]' />
              <WaterIcon class='-ml-1 size-[0.8em]' />
            </div>
            <span class='text-[10px] tracking-wider uppercase'>
              {m.overlay_temperature_external_short()}
            </span>
          </div>
          <span class='overlay-value'>{rovTelemetryStore.waterTemperature.toFixed(1)}°C</span>
        </Badge>
      </Show>
      <Show when={props.electronics}>
        <Badge
          data-critical={isElectronicsTempCritical(rovTelemetryStore.electronicsTemperature)}
          variant={
            isElectronicsTempCritical(rovTelemetryStore.electronicsTemperature)
              ? 'destructive'
              : 'secondary'
          }
          class='overlay-reading'
        >
          <div class='flex shrink-0 items-center text-muted-foreground'>
            <div class='relative mr-1 flex items-center'>
              <ThermometerIcon class='-ml-1 size-[1em]' />
              <CircuitIcon class='-ml-1 size-[0.8em]' />
            </div>
            <span class='text-[10px] tracking-wider uppercase'>
              {m.overlay_temperature_internal_short()}
            </span>
          </div>
          <span class={temperatureValueClass()}>
            {rovTelemetryStore.electronicsTemperature.toFixed(1)}°C
          </span>
        </Badge>
      </Show>
    </div>
  );
};

export { TemperatureIndicator };

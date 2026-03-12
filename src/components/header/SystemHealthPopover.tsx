import { Button } from '@manafishrov/ui/button';
import {
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverPositioner,
  PopoverTrigger,
} from '@manafishrov/ui/popover';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import { Show, createSignal } from 'solid-js';
import HeartPulseIcon from '~icons/material-symbols/monitor-heart';

import * as m from '@/paraglide/messages';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';

function SystemHealthPopover() {
  const [popoverOpen, setPopoverOpen] = createSignal(false);

  return (
    <Show when={connectionStatusStore.isConnected}>
      <Popover
        positioning={{ placement: 'bottom' }}
        onOpenChange={(details) => setPopoverOpen(details.open)}
      >
        <Tooltip positioning={{ placement: 'bottom' }} disabled={popoverOpen()}>
          <TooltipTrigger
            asChild={(tooltipProps) => (
              <span {...tooltipProps()}>
                <PopoverTrigger
                  asChild={(popoverProps) => (
                    <Button
                      {...popoverProps()}
                      tabIndex={-1}
                      size='icon-xs'
                      variant='outline'
                      aria-label={m.aria_labels_system_health()}
                    >
                      <HeartPulseIcon aria-hidden='true' />
                    </Button>
                  )}
                />
              </span>
            )}
          />
          <TooltipPositioner>
            <TooltipContent>
              <span>{m.controls_system_health_title()}</span>
              <TooltipArrow />
            </TooltipContent>
          </TooltipPositioner>
        </Tooltip>
        <PopoverPositioner>
          <PopoverContent class='w-56'>
            <PopoverArrow />
            <div class='space-y-3'>
              <div class='text-sm font-medium'>{m.controls_system_health_title()}</div>
              <div class='space-y-2'>
                <HealthItem
                  label={m.controls_system_health_imu()}
                  healthy={rovStatusStore.health.imuHealthy}
                />
                <HealthItem
                  label={m.controls_system_health_pressure_sensor()}
                  healthy={rovStatusStore.health.pressureSensorHealthy}
                />
                <HealthItem
                  label={m.controls_system_health_microcontroller()}
                  healthy={rovStatusStore.health.microcontrollerHealthy}
                />
              </div>
            </div>
          </PopoverContent>
        </PopoverPositioner>
      </Popover>
    </Show>
  );
}

function HealthItem(props: { label: string; healthy: boolean }) {
  return (
    <div class='flex items-center justify-between gap-3'>
      <span class='text-xs text-muted-foreground'>{props.label}</span>
      <div class={`h-2 w-2 rounded-full ${props.healthy ? 'bg-green-500' : 'bg-destructive'}`} />
    </div>
  );
}

export { SystemHealthPopover };

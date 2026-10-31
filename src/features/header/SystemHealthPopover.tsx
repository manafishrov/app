import type { JSXElement } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { Kbd, KbdGroup } from '@manafishrov/ui/kbd';
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
import HeartPulseIcon from '~icons/material-symbols/monitor-heart';

import * as m from '@/paraglide/messages';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';

import { getMcuHealth, type McuHealth } from './mcuHealth';

const HealthItem = (props: { label: string; healthy: boolean }): JSXElement => (
  <div class='flex items-center justify-between gap-3'>
    <span class='text-xs text-muted-foreground'>{props.label}</span>
    <div class={`h-2 w-2 rounded-full ${props.healthy ? 'bg-green-500' : 'bg-destructive'}`} />
  </div>
);

const mcuHealthDescriptions: Record<McuHealth, () => string> = {
  disconnected: m.controls_system_health_mcu_disconnected,
  protocolFailed: m.controls_system_health_mcu_protocol_failed,
  initializing: m.controls_system_health_mcu_initializing,
  identityMissing: m.controls_system_health_mcu_identity_missing,
  ready: m.controls_system_health_mcu_ready,
};

const mcuHealthColors: Record<McuHealth, string> = {
  disconnected: 'bg-destructive',
  protocolFailed: 'bg-yellow-500',
  initializing: 'bg-yellow-500',
  identityMissing: 'bg-yellow-500',
  ready: 'bg-green-500',
};

const McuHealthItem = (): JSXElement => {
  const health = createMemo(() => getMcuHealth(rovStatusStore));
  return (
    <div class='space-y-1'>
      <div class='flex items-center justify-between gap-3'>
        <span class='text-xs text-muted-foreground'>{m.controls_system_health_mcu()}</span>
        <div
          aria-hidden='true'
          class={`h-2 w-2 shrink-0 rounded-full ${mcuHealthColors[health()]}`}
        />
      </div>
      <p class='text-xs text-muted-foreground'>{mcuHealthDescriptions[health()]()}</p>
    </div>
  );
};

const SystemHealthPopoverContent = (): JSXElement => (
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
          <McuHealthItem />
        </div>
      </div>
    </PopoverContent>
  </PopoverPositioner>
);

const SystemHealthTooltipContent = (props: { isMac: boolean }): JSXElement => (
  <TooltipContent>
    <div class='flex items-center gap-2'>
      <span>{m.controls_system_health_title()}</span>
      <KbdGroup>
        <Kbd>{props.isMac ? '⌘' : 'Ctrl'}</Kbd>
        <Kbd>⇧</Kbd>
        <Kbd>H</Kbd>
      </KbdGroup>
    </div>
    <TooltipArrow />
  </TooltipContent>
);

const useSystemHealthKeybind = (
  setPopoverOpen: (update: (prev: boolean) => boolean) => unknown,
): void => {
  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setPopoverOpen((prev) => !prev);
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    onCleanup(() => {
      globalThis.removeEventListener('keydown', handleKeyDown);
    });
  });
};

const SystemHealthPopover = (props: { isMac: boolean }): JSXElement => {
  const [popoverOpen, setPopoverOpen] = createSignal(false);

  useSystemHealthKeybind(setPopoverOpen);

  return (
    <Show when={connectionStatusStore.isConnected}>
      <Popover
        open={popoverOpen()}
        positioning={{ placement: 'bottom' }}
        onOpenChange={(details): void => {
          setPopoverOpen(details.open);
        }}
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
            <SystemHealthTooltipContent isMac={props.isMac} />
          </TooltipPositioner>
        </Tooltip>
        <SystemHealthPopoverContent />
      </Popover>
    </Show>
  );
};

export { SystemHealthPopover };

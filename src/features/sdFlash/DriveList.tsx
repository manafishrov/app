import { Button } from '@manafishrov/ui/button';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import { For, Show, type Component } from 'solid-js';
import RefreshIcon from '~icons/material-symbols/refresh';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { sdFlashStore, type FlashDrive } from '@/stores/sdFlash';
import { refreshFlashDrives, selectFlashDrive } from '@/tauri';

const BYTES_PER_GB = 1_000_000_000;

const formatGigabytes = (size: number): string =>
  m.firmware_update_drive_size_unit({
    gigabytes: (size / BYTES_PER_GB).toFixed(1),
  });

const driveRowClass = (disabled: boolean, selected: boolean): string => {
  if (disabled) {
    return 'pointer-events-none border-border opacity-50';
  }

  if (selected) {
    return 'border-primary bg-primary/5 ring-1 ring-primary/50';
  }

  return 'border-border hover:bg-muted/40';
};

const DriveRow: Component<{
  drive: FlashDrive;
  selected: boolean;
  disabled: boolean;
}> = (props) => (
  <button
    type='button'
    class={`flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${driveRowClass(props.disabled, props.selected)}`}
    disabled={props.disabled}
    onClick={(): void => {
      selectFlashDrive(props.drive.device);
    }}
  >
    <div class='flex items-center justify-between gap-3'>
      <span class='text-sm font-medium'>{props.drive.description}</span>
      <span class='shrink-0 text-xs text-muted-foreground tabular-nums'>
        {formatGigabytes(props.drive.size)}
      </span>
    </div>
    <div class='text-xs text-muted-foreground'>{props.drive.device}</div>
    <Show when={props.drive.mountpoints.length > 0}>
      <div class='text-xs text-muted-foreground'>
        {props.drive.mountpoints.map((point) => point.path).join(', ')}
      </div>
    </Show>
  </button>
);

const RefreshDrivesButton: Component<{ disabled: boolean }> = (buttonProps) => (
  <Tooltip positioning={{ placement: 'bottom' }}>
    <TooltipTrigger
      asChild={(tooltipProps) => (
        <Button
          {...tooltipProps()}
          variant='ghost'
          size='icon'
          class='h-8 w-8 shrink-0'
          disabled={buttonProps.disabled}
          onClick={(): void => {
            refreshFlashDrives().catch(logError);
          }}
        >
          <RefreshIcon class='h-4 w-4' />
        </Button>
      )}
    />
    <TooltipPositioner>
      <TooltipContent>
        <span>{m.sd_flash_refresh_drives()}</span>
        <TooltipArrow />
      </TooltipContent>
    </TooltipPositioner>
  </Tooltip>
);

export const DriveList: Component<{ disabled: boolean }> = (props) => (
  <div class='flex flex-col gap-3'>
    <div class='flex items-center justify-between'>
      <p class='text-sm text-muted-foreground'>{m.firmware_update_drive_picker_hint()}</p>
      <RefreshDrivesButton disabled={props.disabled} />
    </div>
    <Show
      when={sdFlashStore.drives.length > 0}
      fallback={
        <p class='py-4 text-center text-sm text-muted-foreground'>
          {m.firmware_update_drives_empty()}
        </p>
      }
    >
      <div class='flex flex-col gap-2'>
        <For each={sdFlashStore.drives}>
          {(drive) => (
            <DriveRow
              drive={drive}
              selected={sdFlashStore.selectedDevice === drive.device}
              disabled={props.disabled}
            />
          )}
        </For>
      </div>
    </Show>
  </div>
);

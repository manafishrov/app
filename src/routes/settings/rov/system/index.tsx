import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { Button } from '@manafishrov/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@manafishrov/ui/card';
import { Progress } from '@manafishrov/ui/progress';
import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';
import { For, Show } from 'solid-js';

import { System } from '@/features/settings/forms/System';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';
import { updatesStore, type FlashDrive } from '@/stores/updates';
import {
  cancelFirmwareFlash,
  checkForFirmwareUpdates,
  downloadFirmwareUpdate,
  refreshFlashDrives,
  revealDownloadedFirmware,
  selectFlashDrive,
  startFirmwareFlash,
} from '@/tauri';

const firmwareStatusMessage = (): string => {
  const { firmware } = updatesStore;
  if (firmware.error !== null && firmware.error !== '') {
    return firmware.error;
  }
  if (firmware.status === 'checking') {
    return m.firmware_update_status_checking();
  }
  if (firmware.status === 'verifying') {
    return m.firmware_update_status_verifying();
  }
  if (firmware.status === 'downloading') {
    return m.firmware_update_status_downloading({ percent: firmware.downloadPercent });
  }
  if (firmware.status === 'flashing') {
    return m.firmware_update_status_flashing();
  }
  if (firmware.status === 'flashing-verifying') {
    return m.firmware_update_status_flashing_verifying();
  }
  if (firmware.status === 'flashed') {
    return m.firmware_update_status_flashed();
  }
  if (firmware.status === 'checked' && firmware.manifest !== null) {
    return m.firmware_update_status_checked({ version: firmware.manifest.version });
  }
  if (firmware.status === 'available' && firmware.manifest !== null) {
    return m.firmware_update_status_available({ version: firmware.manifest.version });
  }
  if (firmware.status === 'downloaded' && firmware.downloadedPath !== null) {
    return m.firmware_update_status_downloaded({ path: firmware.downloadedPath });
  }
  return m.firmware_update_status_idle();
};

const formatGigabytes = (size: number): string =>
  m.firmware_update_drive_size_unit({
    gigabytes: (size / 1_000_000_000).toFixed(1),
  });

const flashProgressPercent = (): number => {
  const { firmware } = updatesStore;
  if (firmware.flashTotalBytes === 0) {
    return 0;
  }
  return Math.min(100, Math.round((firmware.flashBytesWritten / firmware.flashTotalBytes) * 100));
};

const FirmwareUpdateStatus: Component = () => (
  <p class='text-sm text-muted-foreground'>{firmwareStatusMessage()}</p>
);

const isChecking = (): boolean => updatesStore.firmware.status === 'checking';
const isDownloading = (): boolean =>
  updatesStore.firmware.status === 'downloading' || updatesStore.firmware.status === 'verifying';
const canDownload = (): boolean => updatesStore.firmware.status === 'available';
const hasDownload = (): boolean =>
  (updatesStore.firmware.status === 'downloaded' ||
    updatesStore.firmware.status === 'flashing' ||
    updatesStore.firmware.status === 'flashing-verifying' ||
    updatesStore.firmware.status === 'flashed') &&
  updatesStore.firmware.downloadedPath !== null;
const FirmwareUpdateActions: Component = () => (
  <CardAction class='flex flex-wrap gap-2'>
    <Button
      variant='outline'
      disabled={isChecking() || isDownloading()}
      onClick={(): void => {
        checkForFirmwareUpdates().catch(logError);
      }}
    >
      {m.firmware_update_button_check()}
    </Button>
    <Button
      variant='outline'
      disabled={!canDownload() || isDownloading()}
      onClick={(): void => {
        downloadFirmwareUpdate().catch(logError);
      }}
    >
      {m.firmware_update_button_download()}
    </Button>
    <Button
      variant='outline'
      disabled={!hasDownload()}
      onClick={(): void => {
        revealDownloadedFirmware();
      }}
    >
      {m.firmware_update_button_reveal()}
    </Button>
  </CardAction>
);

const isFlashing = (): boolean =>
  updatesStore.firmware.status === 'flashing' ||
  updatesStore.firmware.status === 'flashing-verifying';

const FlashDriveItem: Component<{
  drive: FlashDrive;
  selected: boolean;
  disabled: boolean;
}> = (props) => (
  <li>
    <button
      type='button'
      class={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
        props.selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40'
      }`}
      disabled={props.disabled}
      onClick={(): void => {
        selectFlashDrive(props.drive.device);
      }}
    >
      <div class='flex items-center justify-between gap-3'>
        <span class='font-medium'>{props.drive.description}</span>
        <span class='text-muted-foreground'>{formatGigabytes(props.drive.size)}</span>
      </div>
      <div class='text-xs text-muted-foreground'>{props.drive.device}</div>
      <Show when={props.drive.mountpoints.length > 0}>
        <div class='text-xs text-muted-foreground'>
          {props.drive.mountpoints.map((point) => point.path).join(', ')}
        </div>
      </Show>
    </button>
  </li>
);

const FlashDrivePicker: Component = () => (
  <div class='flex flex-col gap-3'>
    <div class='flex items-center justify-between'>
      <h4 class='text-sm font-medium'>{m.firmware_update_drive_picker_title()}</h4>
      <Button
        variant='outline'
        size='sm'
        disabled={isFlashing()}
        onClick={(): void => {
          refreshFlashDrives().catch(logError);
        }}
      >
        {m.firmware_update_button_refresh_drives()}
      </Button>
    </div>
    <p class='text-sm text-muted-foreground'>{m.firmware_update_drive_picker_hint()}</p>
    <Show
      when={updatesStore.firmware.drives.length > 0}
      fallback={<p class='text-sm text-muted-foreground'>{m.firmware_update_drives_empty()}</p>}
    >
      <ul class='flex flex-col gap-2'>
        <For each={updatesStore.firmware.drives}>
          {(drive) => (
            <FlashDriveItem
              drive={drive}
              selected={updatesStore.firmware.selectedDevice === drive.device}
              disabled={isFlashing()}
            />
          )}
        </For>
      </ul>
    </Show>
    <p class='text-xs text-destructive'>{m.firmware_update_warning_data_loss()}</p>
  </div>
);

const FlashProgress: Component = () => (
  <div class='flex flex-col gap-2'>
    <Progress value={flashProgressPercent()} />
    <p class='text-xs text-muted-foreground'>
      {m.firmware_update_flash_progress({
        written: updatesStore.firmware.flashBytesWritten.toLocaleString(),
        total: updatesStore.firmware.flashTotalBytes.toLocaleString(),
        rate: (updatesStore.firmware.flashBytesPerSecond / 1_000_000).toFixed(1),
      })}
    </p>
    <Button
      variant='outline'
      onClick={(): void => {
        cancelFirmwareFlash().catch(logError);
      }}
    >
      {m.firmware_update_button_cancel_flash()}
    </Button>
  </div>
);

const FlashControls: Component = () => (
  <div class='flex flex-wrap gap-2'>
    <Button
      disabled={updatesStore.firmware.selectedDevice === null || isFlashing()}
      onClick={(): void => {
        startFirmwareFlash().catch(logError);
      }}
    >
      {m.firmware_update_button_flash()}
    </Button>
  </div>
);

const FirmwareUpdateSection: Component = () => (
  <Card class='my-8'>
    <CardHeader>
      <CardTitle>{m.general_rov_settings_firmware_version_title()}</CardTitle>
      <CardDescription>{m.general_rov_settings_firmware_version_description()}</CardDescription>
      <FirmwareUpdateActions />
    </CardHeader>
    <CardContent class='flex flex-col gap-3'>
      <div class='flex flex-wrap items-center gap-3'>
        <Badge class='bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
          v{rovConfigStore.firmwareVersion}
        </Badge>
        <FirmwareUpdateStatus />
      </div>
      {isDownloading() && <Progress value={updatesStore.firmware.downloadPercent} />}
      {hasDownload() && (
        <>
          <FlashDrivePicker />
          {isFlashing() ? <FlashProgress /> : <FlashControls />}
        </>
      )}
    </CardContent>
  </Card>
);

const SystemRovSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.general_rov_settings_page_title()}</H1>
      <P>{m.general_rov_settings_page_description()}</P>
    </div>
    <FirmwareUpdateSection />
    <System />
  </>
);

export const Route = createFileRoute('/settings/rov/system/')({
  component: SystemRovSettingsPage,
});

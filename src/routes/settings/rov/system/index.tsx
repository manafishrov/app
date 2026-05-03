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
import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { System } from '@/features/settings/forms/System';
import { ConfirmUpdateButton } from '@/features/update/ConfirmUpdateButton';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';
import { updatesStore } from '@/stores/updates';
import { checkForFirmwareUpdates, downloadFirmwareUpdate } from '@/tauri';

const getLatestFirmwareVersion = (): string => {
  const { manifest } = updatesStore.firmware;
  return manifest ? manifest.version : m.common_not_available();
};

const staticFirmwareUpdateStatusMessages: Record<string, () => string> = {
  idle: m.general_rov_settings_firmware_update_status_checking,
  checking: m.general_rov_settings_firmware_update_status_checking,
  downloading: m.general_rov_settings_firmware_update_status_downloading,
  uploading: m.general_rov_settings_firmware_update_status_uploading,
  installing: m.general_rov_settings_firmware_update_status_installing,
  upToDate: m.general_rov_settings_firmware_update_status_up_to_date,
};

const createFirmwareUpdateStatusMessage = (): string => {
  const staticMessage = staticFirmwareUpdateStatusMessages[updatesStore.firmware.status];
  if (staticMessage) {
    return staticMessage();
  }

  if (updatesStore.firmware.status === 'available') {
    return m.general_rov_settings_firmware_update_status_available({
      version: getLatestFirmwareVersion(),
    });
  }

  if (updatesStore.firmware.status === 'checked') {
    return m.general_rov_settings_firmware_update_status_latest_available({
      version: getLatestFirmwareVersion(),
    });
  }

  if (updatesStore.firmware.status === 'downloaded') {
    return m.general_rov_settings_firmware_update_status_downloaded({
      path: updatesStore.firmware.downloadedPath ?? m.common_not_available(),
    });
  }

  return updatesStore.firmware.error ?? m.general_rov_settings_firmware_update_check_failed();
};

const FirmwareVersionSection: Component = () => (
  <Card class='my-8'>
    <CardHeader>
      <CardTitle>{m.general_rov_settings_firmware_version_title()}</CardTitle>
      <CardDescription>{m.general_rov_settings_firmware_version_description()}</CardDescription>
      <CardAction class='flex flex-wrap gap-2'>
        <Button
          variant='outline'
          disabled={updatesStore.firmware.status === 'checking'}
          onClick={(): void => {
            checkForFirmwareUpdates().catch(logError);
          }}
        >
          {updatesStore.firmware.status === 'checking'
            ? m.general_rov_settings_firmware_update_status_checking()
            : m.common_check_for_updates()}
        </Button>
        <ConfirmUpdateButton
          buttonLabel={m.general_rov_settings_firmware_update_button()}
          confirmLabel={m.general_rov_settings_firmware_update_button()}
          disabled={
            updatesStore.firmware.status === 'checking' ||
            updatesStore.firmware.status === 'downloading' ||
            updatesStore.firmware.status === 'uploading' ||
            updatesStore.firmware.status === 'installing' ||
            updatesStore.firmware.manifest === null ||
            updatesStore.firmware.status === 'upToDate'
          }
          title={m.alerts_firmware_update_title()}
          description={
            <div class='space-y-2'>
              <p>{m.alerts_firmware_update_description()}</p>
              <p>{m.alerts_firmware_update_scripts_warning()}</p>
              <p>{m.alerts_firmware_update_wait_for_completion()}</p>
            </div>
          }
          onConfirm={() => downloadFirmwareUpdate()}
        />
      </CardAction>
    </CardHeader>
    <CardContent>
      <div class='flex flex-wrap items-center gap-3'>
        <Badge class='bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
          v{rovConfigStore.firmwareVersion}
        </Badge>
        <p class='text-sm text-muted-foreground'>{createFirmwareUpdateStatusMessage()}</p>
      </div>
    </CardContent>
  </Card>
);

const SystemRovSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.general_rov_settings_page_title()}</H1>
      <P>{m.general_rov_settings_page_description()}</P>
    </div>
    <FirmwareVersionSection />
    <System />
  </>
);

export const Route = createFileRoute('/settings/rov/system/')({
  component: SystemRovSettingsPage,
});

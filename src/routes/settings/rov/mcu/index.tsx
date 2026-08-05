import { Badge } from '@manafishrov/ui/badge';
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
import { For, Show, type Component } from 'solid-js';

import { Mcu } from '@/features/settings/forms/Mcu';
import { ConfirmUpdateButton } from '@/features/update/ConfirmUpdateButton';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';
import { rovStatusStore, type EscFirmwareVersions } from '@/stores/rovStatus';
import { flashEscFirmware } from '@/tauri';

const getEscFirmwareVersions = (): EscFirmwareVersions => {
  const { deviceInfo, deviceInfoAvailable } = rovStatusStore;
  if (deviceInfoAvailable) {
    return deviceInfo.escFirmwareVersions;
  }
  return rovConfigStore.escFirmwareVersions ?? deviceInfo.escFirmwareVersions;
};

const getCommonEscFirmwareVersion = (): string | null => {
  const versions = getEscFirmwareVersions();
  const [first] = versions;
  if (first === null || !versions.every((version) => version === first)) {
    return null;
  }
  return first;
};

const hasReportedEscFirmwareVersion = (): boolean =>
  getEscFirmwareVersions().some((version) => version !== null);

const getEscFirmwareVersionStatus = (): string => {
  if (!hasReportedEscFirmwareVersion()) {
    return m.general_rov_settings_esc_firmware_version_status_waiting();
  }
  if (getCommonEscFirmwareVersion() !== null) {
    return m.general_rov_settings_esc_firmware_version_status_all();
  }
  return m.general_rov_settings_esc_firmware_version_status_mixed();
};

const handleFlashEscFirmware = (): Promise<void> =>
  flashEscFirmware().catch((error: unknown): never => {
    logError('Failed to flash ESC firmware:', error);
    throw error;
  });

const EscFirmwareFlashAction: Component = () => (
  <span
    title={
      rovStatusStore.deviceInfoAvailable
        ? ''
        : m.general_rov_settings_esc_firmware_flash_unsupported()
    }
  >
    <ConfirmUpdateButton
      buttonLabel={m.general_rov_settings_esc_firmware_flash_button()}
      confirmLabel={m.general_rov_settings_esc_firmware_flash_confirm_action()}
      title={m.general_rov_settings_esc_firmware_flash_confirm_title()}
      description={<p>{m.general_rov_settings_esc_firmware_flash_confirm_description()}</p>}
      disabled={!rovStatusStore.deviceInfoAvailable}
      onConfirm={handleFlashEscFirmware}
    />
  </span>
);

const EscFirmwareVersionCard: Component = () => (
  <Card class='my-8'>
    <CardHeader>
      <CardTitle>{m.general_rov_settings_esc_firmware_version_title()}</CardTitle>
      <CardDescription>{m.general_rov_settings_esc_firmware_version_description()}</CardDescription>
      <CardAction class='flex flex-wrap gap-2'>
        <EscFirmwareFlashAction />
      </CardAction>
    </CardHeader>
    <CardContent class='flex flex-col gap-4'>
      <div class='flex flex-wrap items-center gap-3'>
        <div>
          <Show
            when={getCommonEscFirmwareVersion()}
            fallback={
              <Show
                when={hasReportedEscFirmwareVersion()}
                fallback={
                  <Badge class='bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
                    {m.common_not_available()}
                  </Badge>
                }
              >
                <div class='flex flex-wrap gap-2'>
                  <For each={getEscFirmwareVersions()}>
                    {(version, index) => (
                      <Badge class='bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
                        {m.general_rov_settings_esc_firmware_version_item({
                          esc: index() + 1,
                          version: version === null ? m.common_not_available() : `v${version}`,
                        })}
                      </Badge>
                    )}
                  </For>
                </div>
              </Show>
            }
          >
            {(version) => (
              <Badge class='bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
                v{version()}
              </Badge>
            )}
          </Show>
        </div>
        <p class='text-sm text-muted-foreground'>{getEscFirmwareVersionStatus()}</p>
      </div>
    </CardContent>
  </Card>
);

const McuRovSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.general_rov_settings_mcu_page_title()}</H1>
      <P>{m.general_rov_settings_mcu_page_description()}</P>
    </div>
    <Mcu afterFirmwareCard={<EscFirmwareVersionCard />} />
  </>
);

export const Route = createFileRoute('/settings/rov/mcu/')({
  component: McuRovSettingsPage,
});

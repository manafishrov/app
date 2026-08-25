import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@manafishrov/ui/card';
import { For, Show, type Component } from 'solid-js';

import { VersionBadge } from '@/components/VersionBadge';
import { ConfirmUpdateButton } from '@/features/update/ConfirmUpdateButton';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import {
  rovStatusStore,
  type EscFirmwareUpdate,
  type EscFirmwareVersions,
} from '@/stores/rovStatus';
import { flashEscFirmware } from '@/tauri';

const getEscFirmwareVersions = (): EscFirmwareVersions =>
  rovStatusStore.deviceInfo.escFirmwareVersions;

const getCommonEscFirmwareVersion = (): string | null => {
  const versions = getEscFirmwareVersions();
  const [first] = versions;
  return first !== null && versions.every((version) => version === first) ? first : null;
};

const hasReportedEscFirmwareVersion = (): boolean =>
  getEscFirmwareVersions().some((version) => version !== null);

const ESC_UPDATE_STATUS_MESSAGES: Partial<Record<EscFirmwareUpdate['stage'], () => string>> = {
  awaitingTelemetry: m.general_rov_settings_esc_firmware_status_confirming,
  versionMismatch: m.general_rov_settings_esc_firmware_status_version_mismatch,
  unconfirmed: m.general_rov_settings_esc_firmware_status_unconfirmed,
};

const getEscFirmwareUpdateStatus = (): string | null => {
  const update = rovStatusStore.escFirmwareUpdate;
  if (update.recoveryRequired) {
    return m.general_rov_settings_esc_firmware_status_recovery();
  }
  const statusMessage = ESC_UPDATE_STATUS_MESSAGES[update.stage];
  if (statusMessage) {
    return statusMessage();
  }
  if (update.stage === 'failed' && update.error !== null) {
    return update.error;
  }
  return null;
};

const getEscFirmwareVersionStatus = (): string => {
  const updateStatus = getEscFirmwareUpdateStatus();
  if (updateStatus !== null) {
    return updateStatus;
  }
  if (!hasReportedEscFirmwareVersion()) {
    return m.general_rov_settings_esc_firmware_version_status_waiting();
  }
  return getCommonEscFirmwareVersion() === null
    ? m.general_rov_settings_esc_firmware_version_status_mixed()
    : m.general_rov_settings_esc_firmware_version_status_all();
};

const handleFlashEscFirmware = (): Promise<void> =>
  flashEscFirmware().catch((error: unknown): never => {
    logError('Failed to flash ESC firmware:', error);
    throw error;
  });

const EscFirmwareFlashAction: Component = () => (
  <span>
    <ConfirmUpdateButton
      buttonLabel={m.general_rov_settings_esc_firmware_flash_button()}
      confirmLabel={m.general_rov_settings_esc_firmware_flash_confirm_action()}
      title={m.general_rov_settings_esc_firmware_flash_confirm_title()}
      description={<p>{m.general_rov_settings_esc_firmware_flash_confirm_description()}</p>}
      pendingDescription={m.general_rov_settings_esc_firmware_flash_pending()}
      disabled={
        rovStatusStore.escFirmwareUpdate.active ||
        rovStatusStore.escFirmwareUpdate.stage === 'awaitingTelemetry'
      }
      onConfirm={handleFlashEscFirmware}
    />
  </span>
);

export const EscFirmwareVersionCard: Component = () => (
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
        <Show
          when={getCommonEscFirmwareVersion()}
          fallback={
            <Show
              when={hasReportedEscFirmwareVersion()}
              fallback={<VersionBadge version={m.common_not_available()} />}
            >
              <div class='flex flex-wrap gap-2'>
                <For each={getEscFirmwareVersions()}>
                  {(version, index) => (
                    <VersionBadge version={version ?? m.common_not_available()} class='normal-case'>
                      {m.general_rov_settings_esc_firmware_version_item({
                        esc: index() + 1,
                        version: version === null ? m.common_not_available() : `v${version}`,
                      })}
                    </VersionBadge>
                  )}
                </For>
              </div>
            </Show>
          }
        >
          {(version) => <VersionBadge version={version()} />}
        </Show>
        <p class='text-sm text-muted-foreground'>{getEscFirmwareVersionStatus()}</p>
        <Show when={rovStatusStore.escFirmwareUpdate.active}>
          <p class='text-sm text-muted-foreground'>
            {m.general_rov_settings_esc_firmware_flash_progress({
              percent: rovStatusStore.escFirmwareUpdate.progress,
            })}
          </p>
        </Show>
      </div>
    </CardContent>
  </Card>
);

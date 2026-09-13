import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@manafishrov/ui/card';
import { Link } from '@manafishrov/ui/link';
import { Show, createMemo, onMount, type Component } from 'solid-js';

import { VersionBadge } from '@/components/VersionBadge';
import { logError } from '@/lib/log';
import { isNewerVersion } from '@/lib/version';
import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';
import { VersionsStatus, sdFlashStore } from '@/stores/sdFlash';
import { loadFirmwareVersions } from '@/tauri';

const newerVersionAvailable = (): string | undefined => {
  const installed = rovConfigStore.firmwareVersion;
  if (installed === '' || installed === m.common_not_available()) {
    return;
  }
  let latestStable: (typeof sdFlashStore.versions)[number] | null = null;
  for (const entry of sdFlashStore.versions) {
    if (
      !entry.prerelease &&
      (latestStable === null || isNewerVersion(entry.version, latestStable.version))
    ) {
      latestStable = entry;
    }
  }
  if (!latestStable || !isNewerVersion(latestStable.version, installed)) {
    return;
  }
  return latestStable.version;
};

export const PiFirmwareVersionCard: Component = () => {
  const latestNewer = createMemo(newerVersionAvailable);
  onMount(() => {
    if (sdFlashStore.versionsStatus === VersionsStatus.idle) {
      loadFirmwareVersions().catch(logError);
    }
  });

  return (
    <Card class='my-8'>
      <CardHeader>
        <CardTitle>{m.general_rov_settings_firmware_version_title()}</CardTitle>
        <CardDescription>{m.general_rov_settings_firmware_version_description()}</CardDescription>
      </CardHeader>
      <CardContent class='flex flex-col gap-3'>
        <VersionBadge version={rovConfigStore.firmwareVersion} />
        <Show when={latestNewer()}>
          {(version) => (
            <p class='text-sm text-muted-foreground'>
              {m.general_rov_settings_firmware_update_available({ version: version() })}{' '}
              <Link to='/settings/sd-card' class='text-primary underline-offset-4 hover:underline'>
                {m.general_rov_settings_firmware_update_link()}
              </Link>
            </p>
          )}
        </Show>
      </CardContent>
    </Card>
  );
};

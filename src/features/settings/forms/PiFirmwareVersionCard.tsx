import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@manafishrov/ui/card';
import { Link } from '@manafishrov/ui/link';
import { Show, createMemo, onMount, type Component } from 'solid-js';

import { VersionBadge } from '@/components/VersionBadge';
import { compatibleFirmware, isVerifiedPair } from '@/lib/compatibility';
import { logError } from '@/lib/log';
import { isMobile } from '@/lib/platform';
import { isNewerVersion, newestVersion } from '@/lib/version';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { rovConfigStore } from '@/stores/rovConfig';
import { VersionsStatus, sdFlashStore } from '@/stores/sdFlash';
import { loadFirmwareVersions } from '@/tauri';

const [UNSET]: undefined[] = [];

const newerVersionAvailable = (): string | undefined => {
  const installed = rovConfigStore.firmwareVersion;
  if (installed === '' || installed === m.common_not_available()) {
    return;
  }
  // Only suggest firmware this app was verified with, so legacy ROVs stay on legacy firmware.
  const app = configStore.appVersion;
  const anyFirmware = compatibleFirmware(app).length === 0;
  const latestStable = newestVersion(
    sdFlashStore.versions
      .filter((entry) => !entry.prerelease && (anyFirmware || isVerifiedPair(app, entry.version)))
      .map((entry) => entry.version),
  );
  if (latestStable === UNSET || !isNewerVersion(latestStable, installed)) {
    return;
  }
  return latestStable;
};

export const PiFirmwareVersionCard: Component = () => {
  const latestNewer = createMemo(newerVersionAvailable);
  onMount(() => {
    // Mobile cannot flash SD cards, so there is no firmware release list.
    if (!isMobile && sdFlashStore.versionsStatus === VersionsStatus.idle) {
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

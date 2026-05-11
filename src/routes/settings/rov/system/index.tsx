import { Badge } from '@manafishrov/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@manafishrov/ui/card';
import { Link } from '@manafishrov/ui/link';
import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';
import { Show, createMemo, onMount, type Component } from 'solid-js';

import { ConfigBackup } from '@/features/settings/forms/ConfigBackup';
import { System } from '@/features/settings/forms/System';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';
import { VersionsStatus, sdFlashStore } from '@/stores/sdFlash';
import { loadFirmwareVersions } from '@/tauri';

const stripVersionPrefix = (value: string): string =>
  value.startsWith('v') ? value.slice(1) : value;

const newerVersionAvailable = (): string | undefined => {
  const installed = rovConfigStore.firmwareVersion;
  if (installed === '' || installed === m.common_not_available()) {
    return;
  }

  const [latestEntry] = sdFlashStore.versions;
  if (!latestEntry) {
    return;
  }

  const { version: latest } = latestEntry;
  if (stripVersionPrefix(latest) === stripVersionPrefix(installed)) {
    return;
  }

  return latest;
};

const FirmwareVersionCard: Component = () => {
  const latestNewer = createMemo(newerVersionAvailable);

  return (
    <Card class='my-8'>
      <CardHeader>
        <CardTitle>{m.general_rov_settings_firmware_version_title()}</CardTitle>
        <CardDescription>{m.general_rov_settings_firmware_version_description()}</CardDescription>
      </CardHeader>
      <CardContent class='flex flex-col gap-3'>
        <Badge class='bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
          v{rovConfigStore.firmwareVersion}
        </Badge>
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

const SystemRovSettingsPage: Component = () => {
  onMount(() => {
    if (sdFlashStore.versionsStatus === VersionsStatus.idle) {
      loadFirmwareVersions().catch(logError);
    }
  });

  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <H1>{m.general_rov_settings_page_title()}</H1>
        <P>{m.general_rov_settings_page_description()}</P>
      </div>
      <FirmwareVersionCard />
      <System />
      <ConfigBackup />
    </>
  );
};

export const Route = createFileRoute('/settings/rov/system/')({
  component: SystemRovSettingsPage,
});

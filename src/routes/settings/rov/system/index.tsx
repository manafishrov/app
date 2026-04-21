import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { H1, H4, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { System } from '@/features/settings/forms/System';
import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';

const SystemRovSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.general_rov_settings_page_title()}</H1>
      <P>{m.general_rov_settings_page_description()}</P>
    </div>
    <div class='my-8'>
      <H4>{m.general_rov_settings_firmware_version_title()}</H4>
      <p class='text-sm text-muted-foreground'>
        {m.general_rov_settings_firmware_version_description()}
      </p>
      <Badge class='mt-2 bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
        v{rovConfigStore.firmwareVersion}
      </Badge>
    </div>
    <div class='my-8'>
      <H4>{m.general_rov_settings_mcu_firmware_version_title()}</H4>
      <p class='text-sm text-muted-foreground'>
        {m.general_rov_settings_mcu_firmware_version_description()}
      </p>
      <Badge class='mt-2 bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
        {rovConfigStore.mcuFirmwareVersion === ''
          ? m.common_not_available()
          : `v${rovConfigStore.mcuFirmwareVersion}`}
      </Badge>
    </div>
    <System />
  </>
);

export const Route = createFileRoute('/settings/rov/system/')({
  component: SystemRovSettingsPage,
});

import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { EscFirmwareVersionCard } from '@/features/settings/forms/EscFirmwareVersionCard';
import { McuFirmware } from '@/features/settings/forms/Mcu';
import { PiFirmwareVersionCard } from '@/features/settings/forms/PiFirmwareVersionCard';
import * as m from '@/paraglide/messages';

const FirmwareSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.general_rov_settings_firmware_page_title()}</H1>
      <P>{m.general_rov_settings_firmware_page_description()}</P>
    </div>
    <PiFirmwareVersionCard />
    <McuFirmware />
    <EscFirmwareVersionCard />
  </>
);

export const Route = createFileRoute('/settings/rov/firmware/')({
  component: FirmwareSettingsPage,
});

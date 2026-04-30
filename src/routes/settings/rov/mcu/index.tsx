import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@manafishrov/ui/card';
import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { Mcu } from '@/features/settings/forms/Mcu';
import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';

const getMcuFirmwareVersion = (): string => {
  if (rovConfigStore.mcuFirmwareVersion === '') {
    return m.common_not_available();
  }

  return `v${rovConfigStore.mcuFirmwareVersion}`;
};

const McuFirmwareVersionCard: Component = () => (
  <Card class='my-8'>
    <CardHeader>
      <CardTitle>{m.general_rov_settings_mcu_firmware_version_title()}</CardTitle>
      <CardDescription>{m.general_rov_settings_mcu_firmware_version_description()}</CardDescription>
    </CardHeader>
    <CardContent>
      <Badge class='bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
        {getMcuFirmwareVersion()}
      </Badge>
    </CardContent>
  </Card>
);

const McuRovSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.general_rov_settings_mcu_page_title()}</H1>
      <P>{m.general_rov_settings_mcu_page_description()}</P>
    </div>
    <McuFirmwareVersionCard />
    <Mcu />
  </>
);

export const Route = createFileRoute('/settings/rov/mcu/')({
  component: McuRovSettingsPage,
});

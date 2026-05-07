import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@manafishrov/ui/card';
import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { System } from '@/features/settings/forms/System';
import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';

const FirmwareVersionSection: Component = () => (
  <Card class='my-8'>
    <CardHeader>
      <CardTitle>{m.general_rov_settings_firmware_version_title()}</CardTitle>
      <CardDescription>{m.general_rov_settings_firmware_version_description()}</CardDescription>
    </CardHeader>
    <CardContent>
      <div class='flex flex-wrap items-center gap-3'>
        <Badge class='bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
          v{rovConfigStore.firmwareVersion}
        </Badge>
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

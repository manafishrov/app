import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { ConfigBackup } from '@/features/settings/forms/ConfigBackup';
import { System } from '@/features/settings/forms/System';
import * as m from '@/paraglide/messages';

const SystemRovSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.general_rov_settings_page_title()}</H1>
      <P>{m.general_rov_settings_page_description()}</P>
    </div>
    <System />
    <ConfigBackup />
  </>
);

export const Route = createFileRoute('/settings/rov/system/')({
  component: SystemRovSettingsPage,
});

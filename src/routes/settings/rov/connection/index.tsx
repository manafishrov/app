import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { RovConnection } from '@/features/settings/forms/RovConnection';
import * as m from '@/paraglide/messages';

const ConnectionRovSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.rov_connection_settings_page_title()}</H1>
      <P>{m.rov_connection_settings_page_description()}</P>
    </div>
    <RovConnection />
  </>
);

export const Route = createFileRoute('/settings/rov/connection/')({
  component: ConnectionRovSettingsPage,
});

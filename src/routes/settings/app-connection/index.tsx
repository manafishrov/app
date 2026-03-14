import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { AppConnection } from '@/features/settings/forms/AppConnection';
import * as m from '@/paraglide/messages';

const AppConnectionSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.app_connection_page_title()}</H1>
      <P>{m.app_connection_page_description()}</P>
    </div>
    <AppConnection />
  </>
);

export const Route = createFileRoute('/settings/app-connection/')({
  component: AppConnectionSettingsPage,
});

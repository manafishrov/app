import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { AppConnection } from '@/components/settings/forms/AppConnection';

const AppConnectionSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>Connection</H1>
      <P>
        Configure your Manafish connection settings. Only change this if you know what you are
        doing.
      </P>
    </div>
    <AppConnection />
  </>
);

export const Route = createFileRoute('/settings/app-connection/')({
  component: AppConnectionSettingsPage,
});

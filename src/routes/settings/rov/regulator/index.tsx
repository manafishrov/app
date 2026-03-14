import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { Regulator } from '@/features/settings/forms/regulator';
import * as m from '@/paraglide/messages';

const RegulatorRovSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.regulator_page_title()}</H1>
      <P>{m.regulator_page_description()}</P>
    </div>
    <Regulator />
  </>
);

export const Route = createFileRoute('/settings/rov/regulator/')({
  component: RegulatorRovSettingsPage,
});

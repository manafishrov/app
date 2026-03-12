import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { Power } from '@/components/settings/forms/Power';
import * as m from '@/paraglide/messages';

const PowerRovSettingsPage: Component = () => {
  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <H1>{m.power_page_title()}</H1>
        <P>{m.power_page_description()}</P>
      </div>
      <Power />
    </>
  );
};

export const Route = createFileRoute('/settings/rov/power/')({
  component: PowerRovSettingsPage,
});

import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { Power } from '@/components/settings/forms/Power';

const PowerRovSettingsPage: Component = () => {
  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <H1>Power</H1>
        <P>Configure your Manafish power and battery settings.</P>
      </div>
      <Power />
    </>
  );
};

export const Route = createFileRoute('/settings/rov/power/')({
  component: PowerRovSettingsPage,
});

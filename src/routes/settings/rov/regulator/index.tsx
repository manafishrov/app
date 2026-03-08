import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { Regulator } from '@/components/settings/forms/Regulator';

const RegulatorRovSettingsPage: Component = () => {
  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <H1>Regulator</H1>
        <P>Adjust the regulator settings for the ROV.</P>
      </div>
      <Regulator />
    </>
  );
};

export const Route = createFileRoute('/settings/rov/regulator/')({
  component: RegulatorRovSettingsPage,
});

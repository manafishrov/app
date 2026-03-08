import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

const AppearenceSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>Appearence</H1>
      <P>How stuff looks.</P>
    </div>
  </>
);

export const Route = createFileRoute('/settings/appearence/')({
  component: AppearenceSettingsPage,
});

import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { OverlayLayoutEditor } from '@/features/settings/overlay/OverlayLayoutEditor';
import * as m from '@/paraglide/messages';

const AppearanceSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.settings_application_appearance()}</H1>
      <P>{m.appearance_page_description()}</P>
    </div>
    <OverlayLayoutEditor />
  </>
);

export const Route = createFileRoute('/settings/appearance/')({
  component: AppearanceSettingsPage,
});

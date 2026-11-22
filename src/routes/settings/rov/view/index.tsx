import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { OverlayLayoutEditor } from '@/features/settings/overlay/OverlayLayoutEditor';
import * as m from '@/paraglide/messages';

const ViewRovSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.settings_rov_view()}</H1>
      <P>{m.view_page_description()}</P>
    </div>
    <OverlayLayoutEditor />
  </>
);

export const Route = createFileRoute('/settings/rov/view/')({
  component: ViewRovSettingsPage,
});

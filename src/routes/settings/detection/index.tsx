import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { Detection } from '@/features/settings/forms/detection';
import * as m from '@/paraglide/messages';

const DetectionSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.detection_page_title()}</H1>
      <P>{m.detection_page_description()}</P>
    </div>
    <Detection />
  </>
);

export const Route = createFileRoute('/settings/detection/')({
  component: DetectionSettingsPage,
});

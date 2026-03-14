import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { Calibration } from '@/features/settings/forms/calibration';
import * as m from '@/paraglide/messages';

const CalibrationRovSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.calibration_page_title()}</H1>
      <P>{m.calibration_page_description()}</P>
    </div>
    <Calibration />
  </>
);

export const Route = createFileRoute('/settings/rov/calibration/')({
  component: CalibrationRovSettingsPage,
});

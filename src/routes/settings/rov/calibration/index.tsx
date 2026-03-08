import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

const CalibrationRovSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>Calibration</H1>
      <P>Calibrate the thrusters of the ROV.</P>
    </div>
  </>
);

export const Route = createFileRoute('/settings/rov/calibration/')({
  component: CalibrationRovSettingsPage,
});

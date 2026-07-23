import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { Camera } from '@/features/settings/forms/camera';
import * as m from '@/paraglide/messages';

const CameraRovSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.camera_settings_page_title()}</H1>
      <P>{m.camera_settings_page_description()}</P>
    </div>
    <Camera />
  </>
);

export const Route = createFileRoute('/settings/rov/camera/')({
  component: CameraRovSettingsPage,
});

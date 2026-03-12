import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { KeyboardSettings } from '@/components/settings/input/KeyboardSettings';
import * as m from '@/paraglide/messages';

const KeyboardSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.keyboard_page_title()}</H1>
      <P>{m.keyboard_page_description()}</P>
    </div>
    <KeyboardSettings />
  </>
);

export const Route = createFileRoute('/settings/keyboard/')({
  component: KeyboardSettingsPage,
});

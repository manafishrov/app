import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { GamepadSettings } from '@/components/settings/input/GamepadSettings';
import * as m from '@/paraglide/messages';

const GamepadSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.gamepad_page_title()}</H1>
      <P>{m.gamepad_page_description()}</P>
    </div>
    <GamepadSettings />
  </>
);

export const Route = createFileRoute('/settings/gamepad/')({
  component: GamepadSettingsPage,
});

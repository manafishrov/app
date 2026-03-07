import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';
import type { Component } from 'solid-js';

import { GamepadSettings } from '@/components/settings/input/GamepadSettings';

const Gamepad: Component = () => (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <H1>Gamepad</H1>
        <P>Configure your gamepad bindings for controlling the ROV.</P>
      </div>
      <GamepadSettings />
    </>
  );

export const Route = createFileRoute('/settings/gamepad/')({
  component: Gamepad,
});

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';
import type { Component } from 'solid-js';

import { KeyboardSettings } from '@/components/settings/KeyboardSettings';

const Keyboard: Component = () => (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <H1>Keyboard</H1>
        <P>Configure your keyboard bindings for controlling the ROV.</P>
      </div>
      <KeyboardSettings />
    </>
  );

export const Route = createFileRoute('/settings/keyboard/')({
  component: Keyboard,
});

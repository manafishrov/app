import { createFileRoute } from '@tanstack/solid-router';
import { type Component } from 'solid-js';

// import { GamepadSettings } from '@/components/settings/GamepadSettings';

const Gamepad: Component = () => {
  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <h1 class='text-4xl font-extrabold tracking-tight'>Gamepad</h1>
        <p class='text-muted-foreground'>
          Configure your gamepad bindings for controlling the ROV.
        </p>
      </div>
      {/* <GamepadSettings /> */}
    </>
  );
};

export const Route = createFileRoute('/settings/gamepad/')({
  component: Gamepad,
});

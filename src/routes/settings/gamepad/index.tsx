import { createFileRoute } from '@tanstack/react-router';

import { GamepadSettings } from '@/components/settings/GamepadSettings';

export const Route = createFileRoute('/settings/gamepad/')({
  component: Gamepad,
});

function Gamepad() {
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Gamepad</h1>
        <p className='text-muted-foreground'>
          Configure your gamepad bindings for controlling the ROV.
        </p>
      </div>
      <GamepadSettings />
    </>
  );
}

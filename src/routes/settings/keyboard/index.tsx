import { createFileRoute } from '@tanstack/react-router';

import { KeyboardSettings } from '@/components/settings/KeyboardSettings';

export const Route = createFileRoute('/settings/keyboard/')({
  component: Keyboard,
});

function Keyboard() {
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Keyboard</h1>
        <p className='text-muted-foreground'>
          Configure your keyboard bindings for controlling the drone.
        </p>
      </div>
      <KeyboardSettings />
    </>
  );
}

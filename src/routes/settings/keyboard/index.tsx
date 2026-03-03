import { createFileRoute } from '@tanstack/solid-router';
import { type Component } from 'solid-js';

// import { KeyboardSettings } from '@/components/settings/KeyboardSettings';

const Keyboard: Component = () => {
  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <h1 class='text-4xl font-extrabold tracking-tight'>Keyboard</h1>
        <p class='text-muted-foreground'>
          Configure your keyboard bindings for controlling the ROV.
        </p>
      </div>
      {/* <KeyboardSettings /> */}
    </>
  );
};

export const Route = createFileRoute('/settings/keyboard/')({
  component: Keyboard,
});

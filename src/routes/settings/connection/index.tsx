import { createFileRoute } from '@tanstack/solid-router';
import { type Component } from 'solid-js';

// import { ConnectionSettingsForm } from '@/components/settings/ConnectionSettingsForm';

const Connection: Component = () => {
  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <h1 class='text-4xl font-extrabold tracking-tight'>Connection</h1>
        <p class='text-muted-foreground'>
          Configure your Manafish connection settings. Only change this if you know what you are
          doing.
        </p>
      </div>
      {/* <ConnectionSettingsForm /> */}
    </>
  );
};

export const Route = createFileRoute('/settings/connection/')({
  component: Connection,
});

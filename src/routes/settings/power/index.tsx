// import { PowerSettingsForm } from '@/components/settings/rov/PowerSettingsForm';
import { Spinner } from '@manafishrov/ui/spinner';
import { createFileRoute } from '@tanstack/solid-router';
import { type Component } from 'solid-js';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';

const Power: Component = () => {
  const isConnected = () => connectionStatusStore.isConnected;
  const rovConfig = () => rovConfigStore;

  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <h1 class='text-4xl font-extrabold tracking-tight'>Power</h1>
        <p class='text-muted-foreground'>Configure your Manafish power and battery settings.</p>
      </div>
      <Show
        when={isConnected() && rovConfig()}
        fallback={
          <div class='flex h-96 w-full items-center justify-center'>
            <Spinner class='size-8' />
          </div>
        }
      >
        {/* <PowerSettingsForm /> */}
      </Show>
    </>
  );
};

export const Route = createFileRoute('/settings/power/')({
  component: Power,
});

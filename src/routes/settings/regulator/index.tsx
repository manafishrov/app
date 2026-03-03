// import { DirectionCoefficientsForm } from '@/components/settings/rov/DirectionCoefficientsForm';
// import { PidForm } from '@/components/settings/rov/PidForm';
import { Spinner } from '@manafishrov/ui/spinner';
import { createFileRoute } from '@tanstack/solid-router';
import { type Component, Show } from 'solid-js';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';

const Regulator: Component = () => {
  const isConnected = () => connectionStatusStore.isConnected;
  const rovConfig = () => rovConfigStore;

  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <h1 class='text-4xl font-extrabold tracking-tight'>Regulator</h1>
        <p class='text-muted-foreground'>Adjust the regulator settings for the ROV.</p>
      </div>
      <Show
        when={isConnected() && rovConfig()}
        fallback={
          <div class='flex h-96 w-full items-center justify-center'>
            <Spinner class='size-8' />
          </div>
        }
      >
        <div class='space-y-8'>
          {/* <PidForm /> */}
          {/* <DirectionCoefficientsForm /> */}
        </div>
      </Show>
    </>
  );
};

export const Route = createFileRoute('/settings/regulator/')({
  component: Regulator,
});

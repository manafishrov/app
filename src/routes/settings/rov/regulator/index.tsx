// Import { DirectionCoefficientsForm } from '@/components/settings/rov/DirectionCoefficientsForm';
// Import { PidForm } from '@/components/settings/rov/PidForm';
import { Spinner } from '@manafishrov/ui/spinner';
import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';
import type { Component } from 'solid-js';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';

const Regulator: Component = () => {
  const isConnected = () => connectionStatusStore.isConnected;
  const rovConfig = () => rovConfigStore;

  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <H1>Regulator</H1>
        <P>Adjust the regulator settings for the ROV.</P>
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

export const Route = createFileRoute('/settings/rov/regulator/')({
  component: Regulator,
});

// import { ThrusterAllocationTable } from '@/components/settings/rov/ThrusterAllocationTable';
// import { ThrusterPinSetupTable } from '@/components/settings/rov/ThrusterPinSetupTable';
import { Spinner } from '@manafishrov/ui/spinner';
import { createFileRoute } from '@tanstack/solid-router';
import { type Component, Show } from 'solid-js';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';

const Calibration: Component = () => {
  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <h1 class='text-4xl font-extrabold tracking-tight'>Calibration</h1>
        <p class='text-muted-foreground'>Calibrate the thrusters of the ROV.</p>
      </div>
      <Show
        when={connectionStatusStore.isConnected && rovConfigStore}
        fallback={
          <div class='flex h-96 w-full items-center justify-center'>
            <Spinner class='size-8' />
          </div>
        }
      >
        <div class='w-[calc(100svw-7rem)] max-w-full space-y-8 md:w-[calc(100svw-14rem)] lg:w-full'>
          {/* <ThrusterPinSetupTable /> */}
          {/* <ThrusterAllocationTable /> */}
        </div>
      </Show>
    </>
  );
};

export const Route = createFileRoute('/settings/calibration/')({
  component: Calibration,
});

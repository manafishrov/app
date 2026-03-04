// import { ThrusterAllocationTable } from '@/components/settings/rov/ThrusterAllocationTable';
// import { ThrusterPinSetupTable } from '@/components/settings/rov/ThrusterPinSetupTable';
import { Spinner } from '@manafishrov/ui/spinner';
import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';
import { type Component } from 'solid-js';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';

const Calibration: Component = () => {
  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <H1>Calibration</H1>
        <P>Calibrate the thrusters of the ROV.</P>
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

import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';

import { ThrusterAllocationTable } from '@/components/settings/rov/ThrusterAllocationTable';
import { ThrusterPinSetupTable } from '@/components/settings/rov/ThrusterPinSetupTableForm';
import { Spinner } from '@/components/ui/Spinner';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';

export const Route = createFileRoute('/settings/calibration/')({
  component: Calibration,
});

function Calibration() {
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );
  const rovConfig = useStore(rovConfigStore);
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Calibration</h1>
        <p className='text-muted-foreground'>
          Calibrate the thrusters of the ROV.
        </p>
      </div>
      {!isConnected || !rovConfig ? (
        <div className='flex h-96 w-full items-center justify-center'>
          <Spinner size='lg' />
        </div>
      ) : (
        <div className='w-[calc(100svw-7rem)] max-w-full space-y-8 md:w-[calc(100svw-14rem)] lg:w-full'>
          <ThrusterPinSetupTable />
          <ThrusterAllocationTable />
        </div>
      )}
    </>
  );
}

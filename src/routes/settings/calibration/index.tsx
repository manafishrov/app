import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';

import { ThrusterAllocationTable } from '@/components/settings/drone/ThrusterAllocationTable';
import { ThrusterPinSetupTable } from '@/components/settings/drone/ThrusterPinSetupTable';
import { Spinner } from '@/components/ui/Spinner';

import {
  droneConfigStore,
  requestThrusterConfig,
} from '@/stores/droneConfigStore';
import { webSocketConnectionStore } from '@/stores/webSocketConnectionStore';

export const Route = createFileRoute('/settings/calibration/')({
  component: Calibration,
  loader: requestThrusterConfig,
});

function Calibration() {
  const { isConnected } = useStore(webSocketConnectionStore);
  const { thrusterPinSetup, thrusterAllocation } = useStore(droneConfigStore);
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Calibration</h1>
        <p className='text-muted-foreground'>
          Calibrate the thrusters of the ROV.
        </p>
      </div>
      {!isConnected || !thrusterPinSetup || !thrusterAllocation ? (
        <div className='flex h-96 w-full items-center justify-center'>
          <Spinner size='lg' />
        </div>
      ) : (
        <div className='w-[calc(100svw-7rem)] max-w-full space-y-6 md:w-[calc(100svw-14rem)] lg:w-full'>
          <ThrusterPinSetupTable />
          <ThrusterAllocationTable />
        </div>
      )}
    </>
  );
}

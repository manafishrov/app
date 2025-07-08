import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';

import { PidForm } from '@/components/settings/drone/PidForm';
import { Spinner } from '@/components/ui/Spinner';

import {
  droneConfigStore,
  requestRegulatorConfig,
} from '@/stores/droneConfigStore';
import { webSocketConnectionStore } from '@/stores/webSocketConnectionStore';

export const Route = createFileRoute('/settings/regulator/')({
  component: Regulator,
  loader: requestRegulatorConfig,
});

function Regulator() {
  const { isConnected } = useStore(webSocketConnectionStore);
  const { regulator, movementCoefficients } = useStore(droneConfigStore);
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Regulator</h1>
        <p className='text-muted-foreground'>
          Adjust the regulator settings for the ROV.
        </p>
      </div>
      {!isConnected || !regulator || !movementCoefficients ? (
        <div className='flex h-96 w-full items-center justify-center'>
          <Spinner size='lg' />
        </div>
      ) : (
        <div className='space-y-6'>
          <PidForm />
          <h3 className='text-2xl font-semibold tracking-tight'>
            Movement Coefficients
          </h3>
        </div>
      )}
    </>
  );
}

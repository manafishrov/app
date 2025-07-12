import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';

import { MovementCoefficientsForm } from '@/components/settings/rov/MovementCoefficientsForm';
import { PidForm } from '@/components/settings/rov/PidForm';
import { Spinner } from '@/components/ui/Spinner';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';
import { requestRovConfig } from '@/stores/rovConfig';

export const Route = createFileRoute('/settings/regulator/')({
  component: Regulator,
  loader: requestRovConfig,
});

function Regulator() {
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );
  const rovConfig = useStore(rovConfigStore);
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Regulator</h1>
        <p className='text-muted-foreground'>
          Adjust the regulator settings for the ROV.
        </p>
      </div>
      {!isConnected || !rovConfig ? (
        <div className='flex h-96 w-full items-center justify-center'>
          <Spinner size='lg' />
        </div>
      ) : (
        <div className='space-y-8'>
          <PidForm />
          <MovementCoefficientsForm />
        </div>
      )}
    </>
  );
}

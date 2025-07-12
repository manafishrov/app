import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';

import { PowerSettingsForm } from '@/components/settings/rov/PowerSettingsForm';
import { Spinner } from '@/components/ui/Spinner';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';

export const Route = createFileRoute('/settings/power/')({
  component: Power,
});

function Power() {
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );
  const rovConfig = useStore(rovConfigStore);
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Power</h1>
        <p className='text-muted-foreground'>
          Configure your Manafish power and battery settings.
        </p>
      </div>
      {!isConnected || !rovConfig ? (
        <div className='flex h-96 w-full items-center justify-center'>
          <Spinner size='lg' />
        </div>
      ) : (
        <PowerSettingsForm />
      )}
    </>
  );
}

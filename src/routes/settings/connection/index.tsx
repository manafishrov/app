import { createFileRoute } from '@tanstack/react-router';

import { ConnectionSettingsForm } from '@/components/settings/ConnectionSettingsForm';

export const Route = createFileRoute('/settings/connection/')({
  component: Connection,
});

function Connection() {
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Connection</h1>
        <p className='text-muted-foreground'>
          Configure your Manafish connection settings. Only change this if you
          know what you are doing.
        </p>
      </div>
      <ConnectionSettingsForm />
    </>
  );
}

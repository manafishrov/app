import { createFileRoute } from '@tanstack/react-router';

import { requestRegulatorConfig } from '@/stores/droneConfigStore';

export const Route = createFileRoute('/settings/regulator/')({
  component: Regulator,
  loader: requestRegulatorConfig,
});

function Regulator() {
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Regulator</h1>
        <p className='text-muted-foreground'>
          Adjust the regulator settings for the ROV.
        </p>
      </div>
    </>
  );
}

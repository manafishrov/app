import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';

import { requestRegulatorConfig } from '@/stores/droneConfigStore';
import { droneConfigStore } from '@/stores/droneConfigStore';

export const Route = createFileRoute('/settings/regulator/')({
  component: Regulator,
  loader: requestRegulatorConfig,
});

function Regulator() {
  const { regulator } = useStore(droneConfigStore);

  if (!regulator) {
    return;
  }
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Regulator</h1>
        <p className='text-muted-foreground'>
          Adjust the regulator settings for the ROV.
        </p>
      </div>
      <div className='space-y-6'>
        <h3 className='text-2xl font-semibold tracking-tight'>
          PID (Proportional-Integral-Derivative) controller
        </h3>
        <h4 className='text-lg font-medium'>Pitch</h4>
        <h4 className='text-lg font-medium'>Roll</h4>
        <h4 className='text-lg font-medium'>Depth</h4>
        <h3 className='text-2xl font-semibold tracking-tight'>
          Speed Coefficient
        </h3>
      </div>
    </>
  );
}

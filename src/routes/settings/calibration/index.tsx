import { createFileRoute } from '@tanstack/react-router';

import { ThrusterAllocationTable } from '@/components/calibration/ThrusterAllocationTable';
import { ThrusterPinSetupTable } from '@/components/calibration/ThrusterPinSetupTable';

export const Route = createFileRoute('/settings/calibration/')({
  component: Calibration,
});

function Calibration() {
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Calibration</h1>
        <p className='text-muted-foreground'>
          Calibrate the thrusters of the ROV.
        </p>
      </div>
      <div className='space-y-6 overflow-x-auto'>
        <ThrusterPinSetupTable />
        <ThrusterAllocationTable />
      </div>
    </>
  );
}

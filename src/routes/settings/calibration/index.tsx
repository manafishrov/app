import { createFileRoute } from '@tanstack/react-router';
import { invoke } from '@tauri-apps/api/core';
import { type UnlistenFn, listen } from '@tauri-apps/api/event';

import { ThrusterAllocationTable } from '@/components/calibration/ThrusterAllocationTable';
import { ThrusterPinSetupTable } from '@/components/calibration/ThrusterPinSetupTable';
import { Spinner } from '@/components/ui/Spinner';

import { logError } from '@/lib/log';

type Row = [number, number, number, number, number, number, number, number];

type ThrusterPinSetup = {
  identifiers: Row;
  spinDirections: Row;
};

type ThrusterAllocation = [Row, Row, Row, Row, Row, Row, Row, Row];

function fetchDataWithTimeout<T>(
  eventName: string,
  timeoutMs: number,
): Promise<T> {
  let unlisten: UnlistenFn;
  let timer: number;

  return new Promise<T>((resolve, reject) => {
    timer = window.setTimeout(() => {
      if (unlisten) {
        unlisten();
      }
      reject(
        new Error(
          `Event '${eventName}' timed out after ${timeoutMs / 1000} seconds.`,
        ),
      );
    }, timeoutMs);

    listen<T>(eventName, (event) => {
      clearTimeout(timer);
      unlisten();
      resolve(event.payload);
    })
      .then((unlistenFn) => {
        unlisten = unlistenFn;
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}

function CalibrationPending() {
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Calibration</h1>
        <p className='text-muted-foreground'>
          Calibrate the thrusters of the ROV.
        </p>
      </div>
      <div className='flex h-96 items-center justify-center'>
        <Spinner size='lg' />
      </div>
    </>
  );
}

export const Route = createFileRoute('/settings/calibration/')({
  pendingComponent: CalibrationPending,
  component: Calibration,
  loader: async () => {
    try {
      const TIMEOUT = 3000;
      const pinSetupPromise = fetchDataWithTimeout<ThrusterPinSetup>(
        'thruster_pin_setup',
        TIMEOUT,
      );
      const allocationPromise = fetchDataWithTimeout<ThrusterAllocation>(
        'thruster_allocation',
        TIMEOUT,
      );
      await invoke('get_thruster_config');
      const [thrusterPinSetup, thrusterAllocation] = await Promise.all([
        pinSetupPromise,
        allocationPromise,
      ]);
      return { thrusterPinSetup, thrusterAllocation };
    } catch (error) {
      logError('Failed to retrieve thruster configuration:', error);
      return { thrusterPinSetup: null, thrusterAllocation: null };
    }
  },
});

function Calibration() {
  const { thrusterPinSetup, thrusterAllocation } = Route.useLoaderData();

  if (!thrusterPinSetup || !thrusterAllocation) {
    return (
      <div className='text-destructive'>
        <h1 className='text-2xl font-bold'>Error</h1>
        <p>Failed to load thruster configuration. Please check the logs.</p>
      </div>
    );
  }

  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Calibration</h1>
        <p className='text-muted-foreground'>
          Calibrate the thrusters of the ROV.
        </p>
      </div>
      <div className='space-y-6 overflow-x-auto'>
        <ThrusterPinSetupTable thrusterPinSetup={thrusterPinSetup} />
        <ThrusterAllocationTable thrusterAllocation={thrusterAllocation} />
      </div>
    </>
  );
}

export type { ThrusterPinSetup, ThrusterAllocation, Row };

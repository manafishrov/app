import { invoke } from '@tauri-apps/api/core';
import { DropletIcon, DropletsIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { toast } from '@/components/ui/Toaster';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

function WaterSensor() {
  const [waterDetected, setWaterDetected] = useState(false);

  const checkWaterSensor = useCallback(async () => {
    try {
      const status = await invoke<boolean>('get_water_sensor_status');
      setWaterDetected(status);

      if (status) {
        toast.error('ALERT: Water detected inside ROV!');
      }
    } catch (e) {
      console.error('Failed to get water sensor status:', e);
      toast.warning('Failed to get water sensor status');
    }
  }, []);

  useEffect(() => {
    void checkWaterSensor();
    const interval = window.setInterval(() => {
      void checkWaterSensor();
    }, 1000);

    return () => clearInterval(interval);
  }, [checkWaterSensor]);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger
          className='cursor-default'
          aria-label={`Water sensor: ${waterDetected ? 'Water detected!' : 'No water detected'}`}
        >
          {waterDetected ? (
            <DropletsIcon className='h-[1.2rem] w-[1.2rem] animate-pulse text-destructive' />
          ) : (
            <DropletIcon className='h-[1.2rem] w-[1.2rem] text-primary' />
          )}
        </TooltipTrigger>
        <TooltipContent
          sideOffset={10}
          collisionPadding={8}
          className={
            !waterDetected
              ? 'bg-primary text-primary-foreground'
              : 'bg-destructive text-destructive-foreground'
          }
        >
          <p>
            {waterDetected
              ? 'ALERT: Water detected inside ROV!'
              : 'No water detected inside ROV'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { WaterSensor };

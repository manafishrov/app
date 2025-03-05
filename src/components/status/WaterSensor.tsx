import { useDeviceStatusStore } from '@/stores/deviceStatusStore';
import { DropletIcon, DropletsIcon } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

function WaterSensor() {
  const isConnected = useDeviceStatusStore((state) => state.isConnected);
  const waterDetected = useDeviceStatusStore((state) => state.waterDetected);

  if (!isConnected) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger
          className='cursor-default rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
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

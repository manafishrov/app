import { DropletIcon, DropletsIcon } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

import { useStatus } from '@/hooks/useStatus';

function WaterStatus() {
  const { data: status } = useStatus();

  if (!status?.isConnected) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger
          className='focus-visible:ring-ring cursor-default rounded-md bg-black/50 p-2 transition-colors focus-visible:ring-1 focus-visible:outline-none'
          aria-label={`Water sensor: ${
            status?.waterDetected ? 'Water detected!' : 'No water detected'
          }`}
        >
          {status?.waterDetected ? (
            <DropletsIcon className='text-destructive h-[1.2rem] w-[1.2rem] animate-pulse' />
          ) : (
            <DropletIcon className='text-primary h-[1.2rem] w-[1.2rem]' />
          )}
        </TooltipTrigger>
        <TooltipContent
          sideOffset={10}
          collisionPadding={8}
          className={
            !status?.waterDetected
              ? 'bg-primary text-primary-foreground'
              : 'bg-destructive text-destructive-foreground'
          }
        >
          <p>
            {status?.waterDetected
              ? 'ALERT: Water detected inside ROV!'
              : 'No water detected inside ROV'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { WaterStatus };

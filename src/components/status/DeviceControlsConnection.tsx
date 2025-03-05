import { useDeviceStatusStore } from '@/stores/deviceStatusStore';
import { LinkIcon, UnlinkIcon } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

function DeviceControlsConnection() {
  const isConnected = useDeviceStatusStore((state) => state.isConnected);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger
          className='cursor-default rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
          aria-label={`Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`}
        >
          {isConnected ? (
            <LinkIcon className='h-[1.2rem] w-[1.2rem] text-primary' />
          ) : (
            <UnlinkIcon className='h-[1.2rem] w-[1.2rem] text-destructive' />
          )}
        </TooltipTrigger>
        <TooltipContent
          sideOffset={10}
          collisionPadding={8}
          className={
            isConnected
              ? 'bg-primary text-primary-foreground'
              : 'bg-destructive text-destructive-foreground'
          }
        >
          <p>
            {isConnected
              ? 'Connected to device controls'
              : 'Disconnected from device controls'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { DeviceControlsConnection };

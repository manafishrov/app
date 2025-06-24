import { useStore } from '@tanstack/react-store';
import { LinkIcon, UnlinkIcon } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

import { statusStore } from '@/stores/statusStore';

function ConnectionStatus() {
  const status = useStore(statusStore, (state) => state);

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger
          className='focus-visible:ring-ring cursor-default rounded-md bg-black/50 p-2 transition-colors focus-visible:ring-1 focus-visible:outline-none'
          aria-label={`Connection status: ${
            status.isConnected ? 'Connected' : 'Disconnected'
          }`}
        >
          {status.isConnected ? (
            <LinkIcon className='text-primary h-[1.2rem] w-[1.2rem]' />
          ) : (
            <UnlinkIcon className='text-destructive h-[1.2rem] w-[1.2rem]' />
          )}
        </TooltipTrigger>
        <TooltipContent
          sideOffset={10}
          collisionPadding={8}
          className={
            status.isConnected
              ? 'bg-primary text-primary-foreground'
              : 'bg-destructive text-destructive-foreground'
          }
        >
          <p>
            {status.isConnected
              ? 'Connected with web sockets'
              : 'Disconnected from web sockets'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { ConnectionStatus };

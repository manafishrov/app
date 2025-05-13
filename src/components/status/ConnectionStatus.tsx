import { LinkIcon, UnlinkIcon } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

import { useStatus } from '@/hooks/useStatus';

function ConnectionStatus() {
  const { data: status } = useStatus();

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger
          className='focus-visible:ring-ring cursor-default rounded-md bg-black/50 p-2 transition-colors focus-visible:ring-1 focus-visible:outline-none'
          aria-label={`Connection status: ${
            status?.isConnected ? 'Connected' : 'Disconnected'
          }`}
        >
          {status?.isConnected ? (
            <LinkIcon className='text-primary h-[1.2rem] w-[1.2rem]' />
          ) : (
            <UnlinkIcon className='text-destructive h-[1.2rem] w-[1.2rem]' />
          )}
        </TooltipTrigger>
        <TooltipContent
          sideOffset={10}
          collisionPadding={8}
          className={
            status?.isConnected
              ? 'bg-primary text-primary-foreground'
              : 'bg-destructive text-destructive-foreground'
          }
        >
          <p>
            {status?.isConnected
              ? 'Connected to device controls'
              : 'Disconnected from device controls'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { ConnectionStatus };

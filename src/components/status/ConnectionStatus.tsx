import { useStore } from '@tanstack/react-store';
import { LinkIcon, UnlinkIcon } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

import { webSocketConnectionStore } from '@/stores/websocketConnectionStore';

function ConnectionStatus() {
  const webSocketConnection = useStore(
    webSocketConnectionStore,
    (state) => state,
  );

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger
          className='focus-visible:ring-ring cursor-default rounded-md bg-black/50 p-2 transition-colors focus-visible:ring-1 focus-visible:outline-none'
          aria-label={`Connection status: ${
            webSocketConnection.isConnected ? 'Connected' : 'Disconnected'
          }`}
        >
          {webSocketConnection.isConnected ? (
            <LinkIcon className='text-primary h-[1.2rem] w-[1.2rem]' />
          ) : (
            <UnlinkIcon className='text-destructive h-[1.2rem] w-[1.2rem]' />
          )}
        </TooltipTrigger>
        <TooltipContent
          sideOffset={10}
          collisionPadding={8}
          className={
            webSocketConnection.isConnected
              ? 'bg-primary text-primary-foreground'
              : 'bg-destructive text-destructive-foreground'
          }
        >
          <p>
            {webSocketConnection.isConnected
              ? 'Connected with web sockets'
              : 'Disconnected from web sockets'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { ConnectionStatus };

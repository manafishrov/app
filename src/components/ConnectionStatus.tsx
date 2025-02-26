import { invoke } from '@tauri-apps/api/core';
import { LinkIcon, UnlinkIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { toast } from '@/components/ui/Toaster';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const status = await invoke('get_connection_status');
      setIsConnected(status as boolean);
    } catch (e) {
      console.error('Failed to get connection status:', e);
      toast.warning('Failed to get connection status');
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    void checkConnection();
    const interval = window.setInterval(() => {
      void checkConnection();
    }, 1000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          aria-label={`Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`}
        >
          {isConnected ? (
            <LinkIcon className='h-[1.2rem] w-[1.2rem] text-primary' />
          ) : (
            <UnlinkIcon className='h-[1.2rem] w-[1.2rem] text-destructive' />
          )}
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isConnected
              ? 'Connected to controls'
              : 'Disconnected from controls'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

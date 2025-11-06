import { useStore } from '@tanstack/react-store';
import { CheckCircle, HeartPulseIcon, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';

function SystemHealthPopover() {
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );
  const health = useStore(rovStatusStore, (state) => state.health);

  if (!isConnected) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <Popover>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant='outline' size='icon' aria-label='System health'>
                <HeartPulseIcon />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <PopoverContent align='end' className='w-48'>
            <h4 className='text-lg font-medium tracking-tight'>
              System Health
            </h4>
            <div className='space-y-1'>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-sm'>IMU</span>
                {health.imuOk ? (
                  <CheckCircle className='h-4 w-4 text-green-600' />
                ) : (
                  <XCircle className='text-destructive h-4 w-4' />
                )}
              </div>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-sm'>Pressure Sensor</span>
                {health.pressureSensorOk ? (
                  <CheckCircle className='h-4 w-4 text-green-600' />
                ) : (
                  <XCircle className='text-destructive h-4 w-4' />
                )}
              </div>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-sm'>Microcontroller</span>
                {health.microcontrollerOk ? (
                  <CheckCircle className='h-4 w-4 text-green-600' />
                ) : (
                  <XCircle className='text-destructive h-4 w-4' />
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <TooltipContent side='left'>
          <p>System Health</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { SystemHealthPopover };

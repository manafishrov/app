import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';

import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toaster';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';

function StabilizationButtons() {
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );
  const { pitchStabilization, rollStabilization, depthHold } = useStore(
    rovStatusStore,
    (state) => ({
      pitchStabilization: state.pitchStabilization,
      rollStabilization: state.rollStabilization,
      depthHold: state.depthHold,
    }),
  );

  async function handleStabilizationClick() {
    await invoke('toggle_pitch_stabilization').catch(() =>
      toast.error('Failed to toggle stabilization'),
    );
    await invoke('toggle_roll_stabilization').catch(() =>
      toast.error('Failed to toggle stabilization'),
    );
  }

  async function handleDepthHoldClick() {
    await invoke('toggle_depth_hold').catch(() =>
      toast.error('Failed to toggle depth hold'),
    );
  }

  if (!isConnected) return;

  return (
    <div className='flex gap-2'>
      <TooltipProvider>
        <Tooltip delayDuration={700}>
          <TooltipTrigger asChild>
            <Button
              variant={
                pitchStabilization && rollStabilization ? 'default' : 'outline'
              }
              onClick={handleStabilizationClick}
              aria-label='Toggle pitch and roll stabilization'
            >
              Stabilization
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Stabilize pitch & roll</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip delayDuration={700}>
          <TooltipTrigger asChild>
            <Button
              variant={depthHold ? 'default' : 'outline'}
              onClick={handleDepthHoldClick}
              aria-label='Toggle depth hold'
            >
              Depth Hold
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Hold at current depth</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export { StabilizationButtons };

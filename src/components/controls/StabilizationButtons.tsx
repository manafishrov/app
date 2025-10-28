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

import { cx } from '@/lib/utils';

import { connectionStatusStore } from '@/stores/connectionStatus';

function StabilizationButtons({ className }: { className?: string }) {
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );
  async function handleStabilizationClick() {
    try {
      await invoke('toggle_pitch_stabilization');
      await invoke('toggle_roll_stabilization');
    } catch {
      toast.error('Failed to toggle stabilization');
    }
  }

  async function handleDepthHoldClick() {
    try {
      await invoke('toggle_depth_hold');
    } catch {
      toast.error('Failed to toggle depth hold');
    }
  }

  if (!isConnected) return;

  return (
    <div className={cx('flex gap-2', className)}>
      <TooltipProvider>
        <Tooltip delayDuration={700}>
          <TooltipTrigger asChild>
            <Button variant='outline' onClick={handleStabilizationClick}>
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
            <Button variant='outline' onClick={handleDepthHoldClick}>
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

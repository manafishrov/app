import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

import { cx } from '@/lib/utils';

function StabilizationButtons({ className }: { className?: string }) {
  return (
    <div className={cx('flex gap-2', className)}>
      <TooltipProvider>
        <Tooltip delayDuration={700}>
          <TooltipTrigger asChild>
            <Button variant='outline'>Stabilization</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Stabilize pitch & roll</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip delayDuration={700}>
          <TooltipTrigger asChild>
            <Button variant='outline'>Depth Hold</Button>
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

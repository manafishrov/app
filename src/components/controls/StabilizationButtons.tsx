import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

function StabilizationButtons() {
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Stabilization</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Stabilize pitch & roll</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Depth Hold</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Hold at current depth</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
}

export { StabilizationButtons };

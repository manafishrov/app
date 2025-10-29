import { SettingsIcon } from 'lucide-react';

import { Link } from '@/components/ui/Link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

function SettingsButton() {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to='/settings'
            variant='outline'
            size='icon'
            aria-label='Open settings'
          >
            <SettingsIcon />
          </Link>
        </TooltipTrigger>
        <TooltipContent side='left'>
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { SettingsButton };

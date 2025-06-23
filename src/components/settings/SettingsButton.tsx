import { SettingsIcon } from 'lucide-react';

import { Link, type LinkProps } from '@/components/ui/Link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

type SettingsButtonProps = Omit<LinkProps, 'to' | 'aria-label'>;

function SettingsButton(props: SettingsButtonProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to='/settings'
            variant='outline'
            size='icon'
            aria-label='Settings'
            {...props}
          >
            <SettingsIcon />
          </Link>
        </TooltipTrigger>
        <TooltipContent side='right'>
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { SettingsButton };

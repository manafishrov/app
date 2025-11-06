import { useNavigate } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { SettingsIcon } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { Link } from '@/components/ui/Link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { recordingStore } from '@/stores/recording';

function SettingsButton() {
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );
  const isRecording = useStore(recordingStore, (state) => state.isRecording);
  const navigate = useNavigate();

  return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {isRecording ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant='outline'
                    size='icon'
                    aria-label='Open settings'
                  >
                    <SettingsIcon />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Recording in Progress</AlertDialogTitle>
                    <AlertDialogDescription>
                      If you navigate to settings, the recording will be stopped
                      and saved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        void navigate({ to: '/settings' });
                      }}
                    >
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Link
                to='/settings'
                variant='outline'
                size='icon'
                aria-label='Open settings'
              >
                <SettingsIcon />
              </Link>
            )}
          </TooltipTrigger>
          <TooltipContent side={isConnected ? 'bottom' : 'left'}>
            <p>Settings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
  );
}

export { SettingsButton };

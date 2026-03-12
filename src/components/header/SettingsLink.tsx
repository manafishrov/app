import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPositioner,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@manafishrov/ui/alert-dialog';
import { Button } from '@manafishrov/ui/button';
import { Kbd, KbdGroup } from '@manafishrov/ui/kbd';
import { Link } from '@manafishrov/ui/link';
import {
  Tooltip,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
  TooltipArrow,
} from '@manafishrov/ui/tooltip';
import { useNavigate } from '@tanstack/solid-router';
import { Portal } from 'solid-js/web';
import SettingsIcon from '~icons/ic/settings';

import * as m from '@/paraglide/messages';
import { recordingStore } from '@/stores/recording';

interface SettingsLinkProps {
  isMac: boolean;
}

function SettingsLink(props: SettingsLinkProps) {
  const navigate = useNavigate();

  return (
    <Show
      when={recordingStore.isRecording}
      fallback={
        <Tooltip positioning={{ placement: 'bottom' }}>
          <TooltipTrigger
            tabIndex={-1}
            asChild={(triggerProps) => (
              <Link {...triggerProps()} to='/settings' size='icon-xs' variant='outline'>
                <SettingsIcon />
              </Link>
            )}
          />
          <TooltipPositioner>
            <TooltipContent>
              <div class='flex items-center gap-2'>
                <span>{m.common_settings()}</span>
                <KbdGroup>
                  <Kbd>{props.isMac ? '⌘' : 'Ctrl'}</Kbd>
                  <Kbd>,</Kbd>
                </KbdGroup>
              </div>
              <TooltipArrow />
            </TooltipContent>
          </TooltipPositioner>
        </Tooltip>
      }
    >
      <AlertDialog>
        <Tooltip positioning={{ placement: 'bottom' }}>
          <TooltipTrigger
            tabIndex={-1}
            asChild={(tooltipProps) => (
              <AlertDialogTrigger
                {...tooltipProps()}
                asChild={(triggerProps) => (
                  <Button {...triggerProps()} size='icon-xs' variant='outline'>
                    <SettingsIcon />
                  </Button>
                )}
              />
            )}
          />
          <TooltipPositioner>
            <TooltipContent>
              <div class='flex items-center gap-2'>
                <span>{m.common_settings()}</span>
                <KbdGroup>
                  <Kbd>{props.isMac ? '⌘' : 'Ctrl'}</Kbd>
                  <Kbd>,</Kbd>
                </KbdGroup>
              </div>
              <TooltipArrow />
            </TooltipContent>
          </TooltipPositioner>
        </Tooltip>
        <Portal>
          <AlertDialogOverlay />
          <AlertDialogPositioner>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{m.alerts_recording_in_progress_title()}</AlertDialogTitle>
                <AlertDialogDescription>
                  {m.alerts_recording_in_progress_description()}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    void navigate({ to: '/settings' });
                  }}
                >
                  {m.common_continue()}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogPositioner>
        </Portal>
      </AlertDialog>
    </Show>
  );
}

export { SettingsLink };

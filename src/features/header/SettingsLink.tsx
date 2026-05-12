import type { JSXElement } from 'solid-js';

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
import SettingsIcon from '~icons/material-symbols/settings';

import * as m from '@/paraglide/messages';
import { recordingStore } from '@/stores/recording';

type SettingsLinkProps = {
  isMac: boolean;
};

const SettingsTooltipContent = (props: { isMac: boolean }): JSXElement => (
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
);

const noop = function noop(): void {
  // Noop
};

const RecordingSettingsAlertDialog = (props: { isMac: boolean }): JSXElement => {
  const navigate = useNavigate();

  return (
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
          <SettingsTooltipContent isMac={props.isMac} />
        </TooltipPositioner>
      </Tooltip>
      <Portal>
        <AlertDialogOverlay class='rounded-2xl' />
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
                  navigate({ to: '/settings' }).catch(noop);
                }}
              >
                {m.common_continue()}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPositioner>
      </Portal>
    </AlertDialog>
  );
};

const SettingsLink = (props: SettingsLinkProps): JSXElement => (
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
          <SettingsTooltipContent isMac={props.isMac} />
        </TooltipPositioner>
      </Tooltip>
    }
  >
    <RecordingSettingsAlertDialog isMac={props.isMac} />
  </Show>
);

export { SettingsLink };

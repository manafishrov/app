import type { Component } from 'solid-js';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPositioner,
  AlertDialogTitle,
} from '@manafishrov/ui/alert-dialog';
import { Portal } from 'solid-js/web';

import * as m from '@/paraglide/messages';

export const PowerCycleWarningDialog: Component<{ open: boolean; onClose: () => void }> = (
  props,
) => (
  <AlertDialog
    open={props.open}
    onOpenChange={(details) => {
      if (!details.open) {
        props.onClose();
      }
    }}
  >
    <Portal>
      <AlertDialogOverlay class='rounded-2xl' />
      <AlertDialogPositioner>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.mcu_protocol_power_cycle_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.mcu_protocol_power_cycle_description()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={props.onClose}>{m.common_ok()}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPositioner>
    </Portal>
  </AlertDialog>
);

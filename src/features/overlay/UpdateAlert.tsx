import type { Component } from 'solid-js';

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
} from '@manafishrov/ui/alert-dialog';
import { Portal } from 'solid-js/web';

import * as m from '@/paraglide/messages';
import { setUpdaterStore, updaterStore, NULL_VALUE } from '@/stores/updater';
import { startUpdate } from '@/tauri/updater';

export const UpdateAlert: Component = () => (
  <AlertDialog
    open={updaterStore.updateAvailable !== NULL_VALUE}
    onOpenChange={(details): void => {
      if (!details.open) {
        setUpdaterStore({ updateAvailable: NULL_VALUE });
      }
    }}
  >
    <Portal>
      <AlertDialogOverlay />
      <AlertDialogPositioner>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.updater_available_title()}</AlertDialogTitle>
            <AlertDialogDescription>{m.updater_available_description()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(): void => {
                setUpdaterStore({ updateAvailable: NULL_VALUE });
              }}
            >
              {m.common_cancel()}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(): void => {
                const update = updaterStore.updateAvailable;
                if (update) {
                  startUpdate(update);
                }
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

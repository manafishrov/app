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

import * as m from '@/paraglide/messages';

export const ConfirmDeleteAlertDialog: Component<{
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}> = (props) => (
  <AlertDialog
    open={props.name !== ''}
    onOpenChange={(details) => {
      if (!details.open) {
        props.onCancel();
      }
    }}
  >
    <Portal>
      <AlertDialogOverlay />
      <AlertDialogPositioner>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.extensions_delete_title({ name: props.name })}</AlertDialogTitle>
            <AlertDialogDescription>{m.extensions_delete_description()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={props.onCancel}>{m.extensions_cancel()}</AlertDialogCancel>
            <AlertDialogAction variant='destructive' onClick={props.onConfirm}>
              {m.extensions_delete()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPositioner>
    </Portal>
  </AlertDialog>
);

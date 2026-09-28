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

export const ReplaceDraftAlertDialog: Component<{
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = (props) => (
  <AlertDialog
    open={props.open}
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
            <AlertDialogTitle>{m.extensions_replace_title()}</AlertDialogTitle>
            <AlertDialogDescription>{m.extensions_replace_description()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={props.onCancel}>{m.extensions_cancel()}</AlertDialogCancel>
            <AlertDialogAction onClick={props.onConfirm}>
              {m.extensions_replace()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPositioner>
    </Portal>
  </AlertDialog>
);

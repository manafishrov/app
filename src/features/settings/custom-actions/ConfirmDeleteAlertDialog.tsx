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
            <AlertDialogTitle>
              {m.custom_action_scripts_delete_title({ name: props.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.custom_action_scripts_delete_description()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={props.onCancel}>
              {m.custom_action_scripts_cancel()}
            </AlertDialogCancel>
            <AlertDialogAction variant='destructive' onClick={props.onConfirm}>
              {m.custom_action_scripts_delete()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPositioner>
    </Portal>
  </AlertDialog>
);

import type { Component, JSXElement } from 'solid-js';

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
import { Button } from '@manafishrov/ui/button';
import { Portal } from 'solid-js/web';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';

type ConfirmUpdateButtonProps = {
  buttonLabel: string;
  confirmLabel: string;
  title: string;
  description: JSXElement;
  disabled?: boolean;
  onConfirm: () => Promise<void> | void;
};

export const ConfirmUpdateButton: Component<ConfirmUpdateButtonProps> = (props) => {
  const [open, setOpen] = createSignal(false);

  const handleConfirm = (): void => {
    Promise.resolve(props.onConfirm())
      .then(() => {
        setOpen(false);
      })
      .catch((error: unknown) => {
        logError('Failed to confirm update action:', error);
      });
  };

  return (
    <>
      <Button
        disabled={props.disabled}
        onClick={(): void => {
          setOpen(true);
        }}
      >
        {props.buttonLabel}
      </Button>
      <AlertDialog
        open={open()}
        onOpenChange={(details): void => {
          setOpen(details.open);
        }}
      >
        <Portal>
          <AlertDialogOverlay />
          <AlertDialogPositioner>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{props.title}</AlertDialogTitle>
                <AlertDialogDescription>{props.description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm}>{props.confirmLabel}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogPositioner>
        </Portal>
      </AlertDialog>
    </>
  );
};

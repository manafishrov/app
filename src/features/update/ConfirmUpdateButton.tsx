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
  pendingDescription?: string | undefined;
  disabled?: boolean;
  onConfirm: () => Promise<void> | void;
};

const ConfirmUpdateDescription: Component<{
  description: JSXElement;
  isPending: boolean;
  pendingDescription?: string | undefined;
}> = (props) => (
  <AlertDialogDescription>
    <div class='space-y-2'>
      {props.description}
      <Show when={props.isPending && props.pendingDescription}>
        {(description) => <p>{description()}</p>}
      </Show>
    </div>
  </AlertDialogDescription>
);

type ConfirmUpdateAlertDialogProps = Omit<ConfirmUpdateButtonProps, 'onConfirm'> & {
  isPending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => unknown;
  onConfirm: () => void;
};

const ConfirmUpdateFooter: Component<{
  confirmLabel: string;
  isPending: boolean;
  onConfirm: () => void;
}> = (props) => (
  <AlertDialogFooter>
    <AlertDialogCancel disabled={props.isPending}>{m.common_cancel()}</AlertDialogCancel>
    <AlertDialogAction disabled={props.isPending} onClick={props.onConfirm}>
      {props.confirmLabel}
    </AlertDialogAction>
  </AlertDialogFooter>
);

const ConfirmUpdateAlertDialog: Component<ConfirmUpdateAlertDialogProps> = (props) => (
  <AlertDialog
    open={props.open}
    onOpenChange={(details): void => {
      props.onOpenChange(details.open);
    }}
  >
    <Portal>
      <AlertDialogOverlay class='rounded-2xl' />
      <AlertDialogPositioner>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{props.title}</AlertDialogTitle>
            <ConfirmUpdateDescription
              description={props.description}
              isPending={props.isPending}
              pendingDescription={props.pendingDescription}
            />
          </AlertDialogHeader>
          <ConfirmUpdateFooter
            confirmLabel={props.confirmLabel}
            isPending={props.isPending}
            onConfirm={props.onConfirm}
          />
        </AlertDialogContent>
      </AlertDialogPositioner>
    </Portal>
  </AlertDialog>
);

export const ConfirmUpdateButton: Component<ConfirmUpdateButtonProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [isPending, setIsPending] = createSignal(false);

  const handleConfirm = (): void => {
    setIsPending(true);
    Promise.resolve(props.onConfirm())
      .then(() => {
        setOpen(false);
      })
      .catch((error: unknown) => {
        logError('Failed to confirm update action:', error);
      })
      .finally(() => {
        setIsPending(false);
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
      <ConfirmUpdateAlertDialog
        {...props}
        isPending={isPending()}
        open={open()}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
      />
    </>
  );
};

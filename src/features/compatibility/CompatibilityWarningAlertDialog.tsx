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
import { Show, createMemo, createSignal, type Accessor, type Component } from 'solid-js';
import { Portal } from 'solid-js/web';

import { legacyNotice } from '@/features/compatibility/CompatibilityText';
import {
  compatibilityKey,
  isLegacyApp,
  isLegacyFirmware,
  isVerifiedPair,
  releaseVersion,
} from '@/lib/compatibility';
import { logError } from '@/lib/log';
import { parseVersion } from '@/lib/version';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';
import { setConfig } from '@/tauri';

type UnverifiedPair = {
  app: string;
  firmware: string;
  key: string;
};

const connectedUnverifiedPair = (): UnverifiedPair | undefined => {
  const app = configStore.appVersion;
  const firmware = rovConfigStore.firmwareVersion;
  if (
    !connectionStatusStore.isConnected ||
    !parseVersion(app) ||
    !parseVersion(firmware) ||
    isVerifiedPair(app, firmware)
  ) {
    return;
  }
  return { app, firmware, key: compatibilityKey(app, firmware) };
};

const warningDescription = (pair: UnverifiedPair): string =>
  isLegacyApp(pair.app) === isLegacyFirmware(pair.firmware)
    ? m.compatibility_warning_description({
        app: releaseVersion(pair.app),
        firmware: releaseVersion(pair.firmware),
      })
    : legacyNotice();

const createCompatibilityWarning = (): {
  shownPair: Accessor<UnverifiedPair | undefined>;
  close: () => void;
  dismiss: () => void;
} => {
  // Warnings closed with OK come back the next time the app starts.
  const [closedKeys, setClosedKeys] = createSignal<string[]>([]);
  const pair = createMemo(connectedUnverifiedPair);
  const shownPair = createMemo(() => {
    const current = pair();
    if (
      current &&
      !configStore.dismissedCompatibilityWarnings.includes(current.key) &&
      !closedKeys().includes(current.key)
    ) {
      return current;
    }
    return;
  });

  const close = (): void => {
    const current = pair();
    if (current) {
      setClosedKeys((keys) => [...keys, current.key]);
    }
  };

  const dismiss = (): void => {
    const current = pair();
    close();
    if (!current || configStore.dismissedCompatibilityWarnings.includes(current.key)) {
      return;
    }
    setConfig({
      dismissedCompatibilityWarnings: [...configStore.dismissedCompatibilityWarnings, current.key],
    }).catch(logError);
  };

  return { shownPair, close, dismiss };
};

export const CompatibilityWarningAlertDialog: Component = () => {
  const { shownPair, close, dismiss } = createCompatibilityWarning();

  return (
    <AlertDialog
      open={Boolean(shownPair())}
      onOpenChange={(details): void => {
        if (!details.open) {
          close();
        }
      }}
    >
      <Portal>
        <AlertDialogOverlay class='rounded-2xl' />
        <AlertDialogPositioner>
          <AlertDialogContent>
            <Show when={shownPair()}>
              {(pair) => (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{m.compatibility_warning_title()}</AlertDialogTitle>
                    <AlertDialogDescription>{warningDescription(pair())}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={dismiss}>
                      {m.compatibility_warning_dont_show_again()}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={close}>{m.common_ok()}</AlertDialogAction>
                  </AlertDialogFooter>
                </>
              )}
            </Show>
          </AlertDialogContent>
        </AlertDialogPositioner>
      </Portal>
    </AlertDialog>
  );
};

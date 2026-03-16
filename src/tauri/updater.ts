import { ask } from '@tauri-apps/plugin-dialog';
import { check } from '@tauri-apps/plugin-updater';

import { logError, logInfo } from '@/lib/log';
import * as m from '@/paraglide/messages';

export const checkForUpdates = (): Promise<void> =>
  check()
    .then((update) => {
      if (!update) {
        logInfo('No updates available.');
        return;
      }

      logInfo(`Update available: ${update.version}`);

      return ask(m.updater_available_description(), {
        title: m.updater_available_title(),
        kind: 'info',
      }).then((shouldUpdate) => {
        if (!shouldUpdate) {
          logInfo('User ignored update.');
          return;
        }

        logInfo('User accepted update. Starting download and install...');
        return update.downloadAndInstall().then(() => {
          logInfo('Update installed. Ready to restart.');
        });
      });
    })
    .catch((error: unknown) => {
      logError('Error checking for updates:', error);
    });

import { toast } from '@manafishrov/ui/toaster';
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater';

import { logError, logInfo } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { setAppUpdateState, updatesStore } from '@/stores/updates';

const PERCENT_MULTIPLIER = 100;
const MAX_PERCENT = 100;

const showAppUpdateAvailableToast = (version: string): void => {
  toast.create({
    title: m.toasts_update_available(),
    description: m.toasts_app_update_available_description({ version }),
    type: 'info',
  });
};

export const checkForAppUpdates = (showAvailableToast = false): Promise<void> => {
  setAppUpdateState({
    error: null,
    status: 'checking',
  });

  return check()
    .then((update) => {
      if (!update) {
        logInfo('No app updates available.');
        setAppUpdateState({
          availableUpdate: null,
          error: null,
          latestVersion: null,
          status: 'upToDate',
        });
        return;
      }

      logInfo(`App update available: ${update.version}`);
      setAppUpdateState({
        availableUpdate: update,
        error: null,
        latestVersion: update.version,
        status: 'available',
      });
      if (showAvailableToast) {
        showAppUpdateAvailableToast(update.version);
      }
    })
    .catch((error: unknown) => {
      logError('Error checking for app updates:', error);
      setAppUpdateState({
        error: m.general_settings_app_update_check_failed(),
        status: 'error',
      });
    });
};

const toProgressPercent = (downloaded: number, total: number): number => {
  if (total === 0) {
    return 0;
  }

  const percent = downloaded * PERCENT_MULTIPLIER;
  return Math.min(Math.floor(percent / total), MAX_PERCENT);
};

const handleStartedEvent = (
  event: Extract<DownloadEvent, { event: 'Started' }>,
  setContentLength: (len: number) => void,
): void => {
  const { contentLength } = event.data;
  if (typeof contentLength === 'number') {
    setContentLength(contentLength);
  }
};

type ProgressEventArgs = {
  event: Extract<DownloadEvent, { event: 'Progress' }>;
  toastId: string;
  contentLength: number;
  downloaded: { current: number };
};

const handleProgressEvent = ({
  event,
  toastId,
  contentLength,
  downloaded,
}: ProgressEventArgs): void => {
  const { chunkLength } = event.data;
  downloaded.current += chunkLength;
  if (contentLength > 0) {
    const percent = toProgressPercent(downloaded.current, contentLength);
    toast.update(toastId, {
      title: m.toasts_update_downloading_progress({ percent }),
      type: 'loading',
    });
  }
};

const handleFinishedEvent = (toastId: string): void => {
  toast.update(toastId, {
    title: m.toasts_update_downloaded(),
    description: m.toasts_update_installing(),
    type: 'loading',
  });
};

const createDownloadEventHandler = (toastId: string) => {
  const downloaded = { current: 0 };
  let contentLength = 0;

  return (event: DownloadEvent): void => {
    switch (event.event) {
      case 'Started': {
        handleStartedEvent(event, (len) => {
          contentLength = len;
        });
        break;
      }
      case 'Progress': {
        handleProgressEvent({ event, toastId, contentLength, downloaded });
        break;
      }
      case 'Finished': {
        handleFinishedEvent(toastId);
        break;
      }
      default: {
        break;
      }
    }
  };
};

export const installAppUpdate = (): Promise<void> => {
  const update: Update | null = updatesStore.app.availableUpdate;
  if (!update) {
    return Promise.resolve();
  }

  setAppUpdateState({
    error: null,
    status: 'installing',
  });

  const toastId = toast.create({
    title: m.toasts_update_downloading(),
    type: 'loading',
  });

  return update
    .downloadAndInstall(createDownloadEventHandler(toastId))
    .then(() => {
      setAppUpdateState({
        availableUpdate: null,
        error: null,
        latestVersion: update.version,
        status: 'readyToRestart',
      });
      toast.update(toastId, {
        title: m.toasts_update_ready(),
        description: m.toasts_update_restart_to_apply(),
        type: 'success',
      });
      logInfo('App update installed. Ready to restart.');
    })
    .catch((error: unknown) => {
      logError('Error installing app update:', error);
      setAppUpdateState({
        error: m.general_settings_app_update_install_failed(),
        status: 'available',
      });
      toast.update(toastId, {
        title: m.general_settings_app_update_install_failed(),
        type: 'error',
      });
    });
};

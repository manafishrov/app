import { toast } from '@manafishrov/ui/toaster';
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater';

import { logError, logInfo } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { NULL_VALUE, setUpdaterStore } from '@/stores/updater';

const PERCENT_MULTIPLIER = 100;
const MAX_PERCENT = 100;

export const checkForUpdates = (): Promise<void> =>
  check()
    .then((update) => {
      if (!update) {
        logInfo('No updates available.');
        return;
      }

      logInfo(`Update available: ${update.version}`);
      setUpdaterStore({ updateAvailable: update });
    })
    .catch((error: unknown) => {
      logError('Error checking for updates:', error);
    });

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

export const startUpdate = (update: Update): void => {
  setUpdaterStore({ updateAvailable: NULL_VALUE });

  const toastId = toast.create({
    title: m.toasts_update_downloading(),
    type: 'loading',
  });

  update
    .downloadAndInstall(createDownloadEventHandler(toastId))
    .then(() => {
      toast.update(toastId, {
        title: m.toasts_update_ready(),
        description: m.toasts_update_restart_to_apply(),
        type: 'success',
      });
      logInfo('Update installed. Ready to restart.');
    })
    .catch((error: unknown) => {
      logError('Error installing update:', error);
      toast.update(toastId, {
        title: 'Error installing update',
        type: 'error',
      });
    });
};

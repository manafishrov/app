import { toast } from '@manafishrov/ui/toaster';
import { Channel, invoke } from '@tauri-apps/api/core';
import { check, type DownloadEvent } from '@tauri-apps/plugin-updater';

import { logError, logInfo } from '@/lib/log';
import * as m from '@/paraglide/messages';
import {
  ReleasesStatus,
  setAppReleasesState,
  setAppUpdateState,
  updatesStore,
  type AppReleaseEntry,
} from '@/stores/updates';

const PERCENT_MULTIPLIER = 100;
const MAX_PERCENT = 100;
const [UNSET]: undefined[] = [];

export const isUpdaterEnabled = import.meta.env['VITE_UPDATER_DISABLED'] !== '1';

const showAppUpdateAvailableToast = (version: string): void => {
  toast.create({
    title: m.toasts_update_available(),
    description: m.toasts_app_update_available_description({ version }),
    type: 'info',
  });
};

export const checkForAppUpdates = (showAvailableToast = false): Promise<void> => {
  if (!isUpdaterEnabled) {
    return Promise.resolve();
  }

  setAppUpdateState({
    error: UNSET,
    status: 'checking',
  });

  return check()
    .then((update) => {
      if (!update) {
        logInfo('No app updates available.');
        setAppUpdateState({
          availableUpdate: UNSET,
          error: UNSET,
          latestVersion: UNSET,
          releaseNotes: UNSET,
          status: 'upToDate',
        });
        return;
      }

      logInfo(`App update available: ${update.version}`);
      const trimmedNotes = typeof update.body === 'string' ? update.body.trim() : '';
      const releaseNotes = trimmedNotes.length > 0 ? trimmedNotes : UNSET;
      setAppUpdateState({
        availableUpdate: update,
        error: UNSET,
        latestVersion: update.version,
        releaseNotes,
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
  if (!isUpdaterEnabled) {
    return Promise.resolve();
  }

  const update = updatesStore.app.availableUpdate;
  if (!update) {
    return Promise.resolve();
  }

  setAppUpdateState({
    error: UNSET,
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
        availableUpdate: UNSET,
        error: UNSET,
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

type AppReleasePayload = {
  version: string;
  tag: string;
  publishedAt: string;
  prerelease: boolean;
  releaseNotes?: string;
};

const toReleaseEntry = (release: AppReleasePayload): AppReleaseEntry => ({
  version: release.version,
  tag: release.tag,
  publishedAt: release.publishedAt,
  prerelease: release.prerelease,
  ...(typeof release.releaseNotes === 'string' ? { releaseNotes: release.releaseNotes } : {}),
});

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const loadAppReleases = (): Promise<void> => {
  if (!isUpdaterEnabled) {
    return Promise.resolve();
  }

  setAppReleasesState({ status: ReleasesStatus.loading, error: UNSET });
  return invoke<AppReleasePayload[]>('fetch_app_releases')
    .then((releases) => {
      setAppReleasesState({
        status: ReleasesStatus.ready,
        entries: releases.map((release) => toReleaseEntry(release)),
      });
    })
    .catch((error: unknown) => {
      logError('Failed to load app releases:', error);
      setAppReleasesState({ status: ReleasesStatus.error, error: errorMessage(error) });
    });
};

export const installAppReleaseVersion = (tag: string): Promise<void> => {
  if (!isUpdaterEnabled) {
    return Promise.resolve();
  }

  // Picker progress lives in `releases.installingTag`.
  // Shared `app.*` state is written only after a successful install (restart).
  // Leaving it alone on start and error avoids misleading the main update card.
  setAppReleasesState({ installingTag: tag });

  const toastId = toast.create({
    title: m.toasts_update_downloading(),
    type: 'loading',
  });

  const onProgress = new Channel<DownloadEvent>(createDownloadEventHandler(toastId));

  return invoke<undefined>('install_app_release', { tag, onProgress })
    .then(() => {
      setAppReleasesState({ installingTag: UNSET });
      setAppUpdateState({
        availableUpdate: UNSET,
        error: UNSET,
        latestVersion: tag.replace(/^v/, ''),
        status: 'readyToRestart',
      });
      toast.update(toastId, {
        title: m.toasts_update_ready(),
        description: m.toasts_update_restart_to_apply(),
        type: 'success',
      });
      logInfo(`App release ${tag} installed. Ready to restart.`);
    })
    .catch((error: unknown) => {
      logError('Error installing app release:', error);
      setAppReleasesState({ installingTag: UNSET });
      toast.update(toastId, {
        title: m.general_settings_app_update_install_failed(),
        type: 'error',
      });
    });
};

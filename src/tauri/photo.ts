import { toast } from '@manafishrov/ui/toaster';

import { logWarn } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';
import { photoStore, setPhotoStore } from '@/stores/photo';
import { recordingStore } from '@/stores/recording';
import { invokeAction } from '@/tauri/capabilities';
import { invokeCommand } from '@/tauri/core';

const PHOTO_ACTION = 'rov.photo.capture';

const ignoreResult: () => void = () => 0;

const supportsPhotos = (): boolean =>
  capabilityStore.catalog.actions.some((action) => action.id === PHOTO_ACTION);

// ROV errors arrive as `code: message`; operators only need the message.
const errorMessage = (error: unknown): string => String(error).replace(/^[a-z_]+: /, '');

const showCaptureError = (description: string): void => {
  toast.create({ title: m.toasts_photo_capture_failed(), description, type: 'error' });
};

/*
 * Asks the ROV for a full-resolution photo. The video freezes while the camera
 * switches mode, so a white flash marks the freeze as the shutter. Once the ROV
 * has the frame, the photo receiver downloads the JPEG and RAW in the
 * background and reports progress with its own toast.
 */
export const takePhoto = (): Promise<void> => {
  if (photoStore.isCapturing) {
    return Promise.resolve();
  }
  if (!recordingStore.webrtcConnected) {
    showCaptureError(m.toasts_photo_needs_video());
    return Promise.resolve();
  }
  if (!supportsPhotos()) {
    showCaptureError(m.toasts_photo_needs_firmware_update());
    return Promise.resolve();
  }
  setPhotoStore({ isCapturing: true, flashCount: photoStore.flashCount + 1 });
  return invokeAction(PHOTO_ACTION)
    .then(() => invokeCommand<null>('receive_photos', {}, { warnOnly: true }))
    .then(ignoreResult)
    .catch((error: unknown) => {
      logWarn('Failed to take photo', error);
      showCaptureError(errorMessage(error));
    })
    .finally(() => {
      setPhotoStore({ isCapturing: false });
    });
};

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invokeAction: vi.fn(),
  invokeCommand: vi.fn(),
  toast: vi.fn(),
  actions: [{ id: 'rov.photo.capture' }],
  recording: { webrtcConnected: true },
}));

vi.mock('@manafishrov/ui/toaster', () => ({ toast: { create: mocks.toast } }));
vi.mock('@/lib/log', () => ({ logWarn: vi.fn() }));
vi.mock('@/paraglide/messages', () => ({
  toasts_photo_capture_failed: (): string => 'Could not take photo',
  toasts_photo_needs_video: (): string => 'Open the video first',
  toasts_photo_needs_firmware_update: (): string => 'Update the ROV firmware',
}));
vi.mock('@/stores/capabilities', () => ({
  capabilityStore: { catalog: { actions: mocks.actions } },
}));
vi.mock('@/stores/recording', () => ({ recordingStore: mocks.recording }));
vi.mock('@/tauri/capabilities', () => ({ invokeAction: mocks.invokeAction }));
vi.mock('@/tauri/core', () => ({ invokeCommand: mocks.invokeCommand }));

import { photoStore, setPhotoStore } from '@/stores/photo';
import { takePhoto } from '@/tauri/photo';

const reset = (): void => {
  vi.clearAllMocks();
  setPhotoStore({ isCapturing: false, flashCount: 0 });
  mocks.actions.splice(0, mocks.actions.length, { id: 'rov.photo.capture' });
  mocks.recording.webrtcConnected = true;
  mocks.invokeAction.mockImplementation((): Promise<void> => Promise.resolve());
  mocks.invokeCommand.mockImplementation((): Promise<null> => Promise.resolve(null));
};

describe('taking a photo', () => {
  beforeEach(reset);

  it('flashes, captures on the ROV and then receives the photo', () => {
    const photo = takePhoto();

    expect(photoStore.flashCount).toBe(1);
    expect(photoStore.isCapturing).toBe(true);
    return photo.then(() => {
      expect(mocks.invokeAction).toHaveBeenCalledWith('rov.photo.capture');
      expect(mocks.invokeCommand).toHaveBeenCalledWith('receive_photos', {}, { warnOnly: true });
      expect(photoStore.isCapturing).toBe(false);
      expect(mocks.toast).not.toHaveBeenCalled();
    });
  });

  it('ignores presses while the camera is still switching mode', () => {
    const first = takePhoto();
    const second = takePhoto();

    return Promise.all([first, second]).then(() => {
      expect(mocks.invokeAction).toHaveBeenCalledTimes(1);
      expect(photoStore.flashCount).toBe(1);
    });
  });
});

describe('when a photo cannot be taken', () => {
  beforeEach(reset);

  it('explains when the video is not open, without flashing', () =>
    takePhoto().then(() => {
      mocks.recording.webrtcConnected = false;
      return takePhoto().then(() => {
        expect(mocks.invokeAction).toHaveBeenCalledTimes(1);
        expect(photoStore.flashCount).toBe(1);
        expect(mocks.toast).toHaveBeenCalledWith({
          title: 'Could not take photo',
          description: 'Open the video first',
          type: 'error',
        });
      });
    }));

  it('asks for a firmware update when the ROV cannot take photos', () => {
    mocks.actions.splice(0);

    return takePhoto().then(() => {
      expect(mocks.invokeAction).not.toHaveBeenCalled();
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Update the ROV firmware' }),
      );
    });
  });

  it('shows the ROV error and frees the button when the capture fails', () => {
    mocks.invokeAction.mockRejectedValue('operation_failed: A photo is already being taken');

    return takePhoto().then(() => {
      expect(mocks.invokeCommand).not.toHaveBeenCalled();
      expect(photoStore.isCapturing).toBe(false);
      expect(mocks.toast).toHaveBeenCalledWith({
        title: 'Could not take photo',
        description: 'A photo is already being taken',
        type: 'error',
      });
    });
  });
});

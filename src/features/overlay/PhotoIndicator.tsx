import type { Component } from 'solid-js';

import PhotoCameraIcon from '~icons/material-symbols/photo-camera';

import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { photoStore } from '@/stores/photo';
import { playConfirmHaptic } from '@/tauri/gamepad';
import { takePhoto } from '@/tauri/photo';

import { useOverlayContentVisible } from './OverlayPreview';
import { OverlayToggle } from './StabilizationIndicator';

/** Shutter button; it stays pressed while the ROV switches the camera mode. */
const PhotoIndicator: Component = () => {
  const isVisible = useOverlayContentVisible();

  return (
    <div class={isVisible() ? 'overlay-surface overlay-controls pointer-events-auto' : 'hidden'}>
      <OverlayToggle
        active={photoStore.isCapturing}
        label={m.controls_take_photo()}
        onToggle={() => {
          playConfirmHaptic(configStore.selectedGamepadId);
          takePhoto().catch(() => {
            // Failures are reported by takePhoto itself.
          });
        }}
        icon={<PhotoCameraIcon class='size-full' />}
      />
    </div>
  );
};

export { PhotoIndicator };

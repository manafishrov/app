import type { Component } from 'solid-js';

import { photoStore } from '@/stores/photo';

const [undef] = [] as undefined[];

const FLASH_DURATION_MS = 450;
const FLASH_OPACITY = 0.55;
// A softer pulse for operators who asked the system for less motion.
const REDUCED_FLASH_OPACITY = 0.2;

/*
 * A brief white flash over the video when a photo is taken, like a phone
 * camera's shutter. The video freezes while the ROV switches the camera to
 * photo mode; the flash marks that freeze as the shutter instead of a fault.
 */
const ShutterFlash: Component = () => {
  let flash: HTMLDivElement | undefined = undef;

  createEffect(
    on(
      () => photoStore.flashCount,
      () => {
        if (flash === undef) {
          return;
        }
        const reduceMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
        flash.animate(
          [
            { opacity: 0 },
            { opacity: reduceMotion ? REDUCED_FLASH_OPACITY : FLASH_OPACITY, offset: 0.12 },
            { opacity: 0 },
          ],
          { duration: FLASH_DURATION_MS, easing: 'ease-out' },
        );
      },
      { defer: true },
    ),
  );

  return (
    <div
      ref={(el): void => {
        flash = el;
      }}
      class='pointer-events-none absolute inset-0 bg-white opacity-0'
      aria-hidden='true'
    />
  );
};

export { ShutterFlash };

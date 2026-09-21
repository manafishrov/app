import type { Accessor } from 'solid-js';

import { overlayScaleForWidth } from '@/stores/overlayLayout';

/**
 * Tracks an element's width and reports the overlay scale for it.
 *
 * This is what replaces the old manual "overlay scale" setting: the overlay is
 * always the same fraction of the camera feed, so it grows and shrinks with the
 * window instead of needing to be tuned by hand.
 */
export const createOverlayScale = (
  element: Accessor<HTMLElement | undefined>,
): Accessor<number> => {
  const [width, setWidth] = createSignal(0);

  createEffect(() => {
    const target = element();
    if (!target) {
      return;
    }

    setWidth(target.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(target);

    onCleanup(() => {
      observer.disconnect();
    });
  });

  return createMemo(() => overlayScaleForWidth(width()));
};

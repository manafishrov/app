import type { Component } from 'solid-js';

import { getActiveLayout, normaliseLayout } from '@/stores/overlayLayout';
import { getRovOverlay } from '@/stores/rovConfig';

import { OverlayGrid } from './OverlayGrid';

const [undef] = [] as undefined[];

const Overlay: Component = () => {
  const layout = createMemo(() => {
    const active = getActiveLayout(getRovOverlay());
    return active === undef ? undef : normaliseLayout(active);
  });

  return (
    <div class='pointer-events-none absolute inset-0 overflow-hidden'>
      <Show when={layout()}>{(resolved) => <OverlayGrid layout={resolved()} />}</Show>
    </div>
  );
};

export { Overlay };

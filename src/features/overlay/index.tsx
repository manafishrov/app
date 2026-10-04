import type { Component } from 'solid-js';

import { configStore } from '@/stores/config';
import { getActiveLayout, normaliseLayout } from '@/stores/overlayLayout';

import { OverlayGrid } from './OverlayGrid';

const [undef] = [] as undefined[];

const Overlay: Component = () => {
  const layout = createMemo(() => {
    const active = getActiveLayout(configStore.overlay);
    return active === undef ? undef : normaliseLayout(active);
  });

  return (
    <div class='pointer-events-none absolute inset-0 overflow-hidden'>
      <Show when={layout()}>{(resolved) => <OverlayGrid layout={resolved()} />}</Show>
    </div>
  );
};

export { Overlay };

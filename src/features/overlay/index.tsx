import type { Component } from 'solid-js';

import { configStore } from '@/stores/config';
import { getActiveLayout, normaliseLayout } from '@/stores/overlayLayout';

import { OverlayGrid } from './OverlayGrid';
import { createOverlayScale } from './overlayScale';
import { PiUndervoltageWarning } from './PiUndervoltageWarning';

const [undef] = [] as undefined[];

const Overlay: Component = () => {
  const [root, setRoot] = createSignal<HTMLElement>();
  const scale = createOverlayScale(root);

  const layout = createMemo(() => {
    const active = getActiveLayout(configStore.overlay);
    return active === undef ? undef : normaliseLayout(active);
  });

  return (
    <div ref={setRoot} class='pointer-events-none absolute inset-0 overflow-hidden'>
      <PiUndervoltageWarning />
      <Show when={layout()}>
        {(resolved) => <OverlayGrid layout={resolved()} scale={scale()} class='p-4' />}
      </Show>
    </div>
  );
};

export { Overlay };

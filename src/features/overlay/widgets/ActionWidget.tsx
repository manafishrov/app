import type { Component, JSX } from 'solid-js';

import PlayIcon from '~icons/material-symbols/play-arrow';

import type { OverlayWidget } from '@/stores/overlayTypes';

import { useIsOverlayPreview } from '@/features/overlay/OverlayPreview';
import { logError } from '@/lib/log';
import { capabilityStore } from '@/stores/capabilities';
import { isActionAvailable } from '@/stores/capabilityAvailability';
import { invokeAction } from '@/tauri/capabilities';

type Activation = { press: () => void; release: () => void };

const useActivation = (id: () => string, preview: () => boolean): Activation => {
  let activeId: string | null = null;
  const press = (): void => {
    if (activeId === null && !preview() && isActionAvailable(id())) {
      activeId = id();
      invokeAction(activeId, 'press').catch(logError);
    }
  };
  const release = (): void => {
    if (activeId !== null) {
      if (capabilityStore.connected) {
        invokeAction(activeId, 'release').catch(logError);
      }
      activeId = null;
    }
  };
  createEffect(() => {
    if (!isActionAvailable(id())) {
      release();
    }
  });
  onMount(() => {
    window.addEventListener('blur', release);
  });
  onCleanup(() => {
    window.removeEventListener('blur', release);
    release();
  });
  return { press, release };
};

type KeyboardHandlers = Pick<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  'onKeyDown' | 'onKeyUp' | 'onClick'
>;
const keyboardHandlers = (activation: Activation): KeyboardHandlers => ({
  onKeyDown: (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      activation.press();
    }
  },
  onKeyUp: (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      activation.release();
    }
  },
  onClick: (event) => {
    // Assistive technologies can activate a button without a pointer or key event.
    if (event.detail === 0) {
      activation.press();
      activation.release();
    }
  },
});

export const ActionWidget: Component<{ widget: OverlayWidget }> = (props) => {
  const preview = useIsOverlayPreview();
  const id = (): string => props.widget.options.sourceId ?? '';
  const activation = useActivation(id, preview);
  const running = (): boolean => {
    const sample = capabilityStore.samples[`${id()}.running`];
    return Boolean(sample && sample.value === true);
  };
  return (
    <button
      type='button'
      class='overlay-surface overlay-action-widget pointer-events-auto'
      data-running={running()}
      title={props.widget.options.label ?? id()}
      disabled={!preview() && !isActionAvailable(id())}
      onPointerDown={(event) => {
        if (event.button === 0) {
          event.currentTarget.setPointerCapture(event.pointerId);
          activation.press();
        }
      }}
      onPointerUp={activation.release}
      onPointerCancel={activation.release}
      onLostPointerCapture={activation.release}
      onBlur={activation.release}
      {...keyboardHandlers(activation)}
    >
      <PlayIcon class='size-3 shrink-0' />
      <span class='min-w-0 truncate'>{props.widget.options.label ?? id()}</span>
    </button>
  );
};

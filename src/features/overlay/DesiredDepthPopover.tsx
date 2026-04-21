import type { JSXElement } from 'solid-js';

import {
  NumberInput,
  NumberInputControl,
  NumberInputInput,
  NumberInputLabel,
} from '@manafishrov/ui/number-input';

import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import {
  closeDesiredDepthPopup,
  desiredDepthPopupStore,
  openDesiredDepthPopup,
  setDesiredDepthDraft,
} from '@/stores/desiredDepthPopup';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const FOCUS_DELAY_MS = 50;
const ignoreDesiredDepthCloseError = (error: unknown): void => {
  if (error instanceof Error) {
    return;
  }
};

const shouldPreventInputKey = (event: KeyboardEvent): boolean => {
  const popupKeys = [
    configStore.keyboard.desiredDepthEntry,
    configStore.keyboard.desiredDepthIncrease,
    configStore.keyboard.desiredDepthDecrease,
  ];

  return (
    event.key === 'ArrowUp' ||
    event.key === 'ArrowDown' ||
    popupKeys.some((binding) => binding !== null && binding.key === event.code)
  );
};

const DesiredDepthInput = (props: {
  draftDepth: string;
  setDraftDepth: (value: string) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  ref: (el: HTMLInputElement) => void;
}): JSXElement => (
  <NumberInput
    value={props.draftDepth}
    onValueChange={(details) => {
      props.setDraftDepth(details.value);
    }}
    step={0.1}
    min={0}
    formatOptions={{
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }}
  >
    <NumberInputLabel>{m.overlay_desired_depth_label()}</NumberInputLabel>
    <NumberInputControl>
      <NumberInputInput ref={props.ref} onKeyDown={props.handleKeyDown} />
    </NumberInputControl>
  </NumberInput>
);

const DesiredDepthPopoverContent = (): JSXElement => {
  const [inputRef, setInputRef] = createSignal<HTMLInputElement>();

  createEffect(() => {
    if (desiredDepthPopupStore.isOpen) {
      setTimeout(() => {
        const nextInputRef = inputRef();
        if (nextInputRef instanceof HTMLInputElement) {
          nextInputRef.focus();
          nextInputRef.select();
        }
      }, FOCUS_DELAY_MS);
    }
  });

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (shouldPreventInputKey(event)) {
      event.preventDefault();
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      closeDesiredDepthPopup().catch(ignoreDesiredDepthCloseError);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeDesiredDepthPopup().catch(ignoreDesiredDepthCloseError);
    }
  };

  return (
    <div class='pointer-events-auto absolute right-0 bottom-full z-50 mb-2 w-48 rounded-md border bg-popover p-3 text-popover-foreground shadow-md'>
      <div class='absolute top-full right-4 h-3 w-3 -translate-y-1/2 rotate-45 border-r border-b bg-popover' />
      <DesiredDepthInput
        draftDepth={desiredDepthPopupStore.draftDepth}
        setDraftDepth={setDesiredDepthDraft}
        handleKeyDown={handleKeyDown}
        ref={setInputRef}
      />
    </div>
  );
};

export const DesiredDepthPopover = (props: { children: JSXElement }): JSXElement => {
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();

  createEffect(() => {
    const nextContainerRef = containerRef();
    if (!desiredDepthPopupStore.isOpen || !(nextContainerRef instanceof HTMLDivElement)) {
      return;
    }

    const handlePointerDown = ({ target }: PointerEvent): void => {
      if (!(target instanceof Node) || nextContainerRef.contains(target)) {
        return;
      }

      closeDesiredDepthPopup().catch(ignoreDesiredDepthCloseError);
    };

    globalThis.addEventListener('pointerdown', handlePointerDown);
    onCleanup(() => {
      globalThis.removeEventListener('pointerdown', handlePointerDown);
    });
  });

  return (
    <div ref={setContainerRef} class='pointer-events-auto relative inline-flex'>
      <div
        class='cursor-pointer'
        onClick={() => {
          if (desiredDepthPopupStore.isOpen) {
            closeDesiredDepthPopup().catch(ignoreDesiredDepthCloseError);
            return;
          }

          openDesiredDepthPopup(rovTelemetryStore.desiredDepth);
        }}
      >
        {props.children}
      </div>
      <Show when={desiredDepthPopupStore.isOpen}>
        <DesiredDepthPopoverContent />
      </Show>
    </div>
  );
};

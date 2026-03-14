import { cn } from '@manafishrov/ui';
import { useNavigate } from '@tanstack/solid-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  createSignal,
  onMount,
  onCleanup,
  createMemo,
  Show,
  type Component,
  type JSX,
} from 'solid-js';

import * as m from '@/paraglide/messages';

import { RecordingButton } from './RecordingButton';
import { SettingsLink } from './SettingsLink';
import { SystemHealthPopover } from './SystemHealthPopover';

const FULLSCREEN_UPDATE_DELAY = 100;

const WindowButton: Component<{
  onClick: () => void;
  isFocused: boolean;
  focusedColor: string;
  hoverColor: string;
  ariaLabel: string;
  children: JSX.Element;
}> = (props) => (
  <button
    tabIndex={-1}
    onClick={props.onClick}
    class={`relative flex h-3 w-3 cursor-pointer items-center justify-center rounded-full outline-none transition-colors ${
      props.isFocused ? props.focusedColor : `bg-border group-hover:${props.hoverColor}`
    }`}
    aria-label={props.ariaLabel}
  >
    <div class='absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100'>
      {props.children}
    </div>
  </button>
);

const FullscreenIcon: Component<{ isFullscreen: boolean; isFocused: boolean }> = (props) => (
  <Show
    when={props.isFullscreen}
    fallback={
      <>
        <span class='absolute inset-0 m-auto h-[6px] w-[6px] rounded-[1px] bg-[#036200]'></span>
        <span
          class={`absolute inset-0 m-auto h-[2px] w-[10px] -rotate-45 rounded-[1px] transition-colors ${
            props.isFocused ? 'bg-[#28c840]' : 'bg-border group-hover:bg-[#28c840]'
          }`}
        ></span>
      </>
    }
  >
    <span
      class={`absolute inset-0 m-auto h-0 w-0 -translate-x-[2.25px] -translate-y-[2.25px] rounded-[1px] border-b-[4.5px] border-l-[4.5px] border-l-transparent transition-colors ${
        props.isFocused
          ? 'border-b-[#036200]'
          : 'border-b-transparent group-hover:border-b-[#036200]'
      }`}
    ></span>
    <span
      class={`absolute inset-0 m-auto h-0 w-0 translate-x-[2.25px] translate-y-[2.25px] rounded-[1px] border-r-[4.5px] border-t-[4.5px] border-r-transparent transition-colors ${
        props.isFocused
          ? 'border-t-[#036200]'
          : 'border-t-transparent group-hover:border-t-[#036200]'
      }`}
    ></span>
  </Show>
);

const WindowControls: Component<{
  isFocused: boolean;
  isFullscreen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onFullscreen: () => void;
}> = (props) => (
  <div data-tauri-drag-region={false} class='group flex items-center gap-2'>
    <WindowButton
      onClick={props.onClose}
      isFocused={props.isFocused}
      focusedColor='bg-[#ff5f57]'
      hoverColor='bg-[#ff5f57]'
      ariaLabel={m.header_close_window()}
    >
      <span class='absolute inset-0 m-auto h-[1.5px] w-2 rotate-45 rounded-[1px] bg-[#900]'></span>
      <span class='absolute inset-0 m-auto h-[1.5px] w-2 -rotate-45 rounded-[1px] bg-[#900]'></span>
    </WindowButton>
    <WindowButton
      onClick={props.onMinimize}
      isFocused={props.isFocused}
      focusedColor='bg-[#febc2e]'
      hoverColor='bg-[#febc2e]'
      ariaLabel={m.header_minimize_window()}
    >
      <span class='absolute inset-0 m-auto h-[1.5px] w-2 rounded-[1px] bg-[#985600]'></span>
    </WindowButton>
    <WindowButton
      onClick={props.onFullscreen}
      isFocused={props.isFocused}
      focusedColor='bg-[#28c840]'
      hoverColor='bg-[#28c840]'
      ariaLabel={m.header_toggle_fullscreen()}
    >
      <FullscreenIcon isFullscreen={props.isFullscreen} isFocused={props.isFocused} />
    </WindowButton>
  </div>
);

const ignoreError = (): void => {
  // Ignore
};

const createUpdateFullscreenState =
  (setIsFullscreen: (val: boolean) => void): (() => void) =>
  (): void => {
    getCurrentWindow().isFullscreen().then(setIsFullscreen).catch(ignoreError);
  };

const setupKeyboardListener = (navigate: (opts: { to: string }) => Promise<void>): (() => void) => {
  const handleKeyDown = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && event.key === ',') {
      event.preventDefault();
      navigate({ to: '/settings' }).catch(ignoreError);
    }
  };
  globalThis.addEventListener('keydown', handleKeyDown);
  return (): void => {
    globalThis.removeEventListener('keydown', handleKeyDown);
  };
};

const useHeaderEffects = (
  setIsFullscreen: (val: boolean) => void,
  setIsFocused: (val: boolean) => void,
  navigate: (opts: { to: string }) => Promise<void>,
): void => {
  const updateFullscreenState = createUpdateFullscreenState(setIsFullscreen);
  let unlistenFocus: () => void = ignoreError;
  let unlistenResize: () => void = ignoreError;
  let unlistenKeyboard: () => void = ignoreError;

  onMount(() => {
    const win = getCurrentWindow();
    updateFullscreenState();
    win.isFocused().then(setIsFocused).catch(ignoreError);

    win
      .onFocusChanged(({ payload }) => {
        setIsFocused(payload);
        setTimeout(updateFullscreenState, FULLSCREEN_UPDATE_DELAY);
      })
      .then((unlisten) => {
        unlistenFocus = unlisten;
      })
      .catch(ignoreError);

    win
      .onResized(() => {
        setTimeout(updateFullscreenState, FULLSCREEN_UPDATE_DELAY);
      })
      .then((unlisten) => {
        unlistenResize = unlisten;
      })
      .catch(ignoreError);

    unlistenKeyboard = setupKeyboardListener(navigate);
  });

  onCleanup(() => {
    unlistenFocus();
    unlistenResize();
    unlistenKeyboard();
  });
};

const useWindowActions = (
  setIsFullscreen: (val: boolean) => void,
): {
  handleClose: () => void;
  handleMinimize: () => void;
  handleFullscreen: () => void;
} => {
  const handleClose = (): void => {
    getCurrentWindow().close().catch(ignoreError);
  };

  const handleMinimize = (): void => {
    getCurrentWindow().minimize().catch(ignoreError);
  };

  const handleFullscreen = (): void => {
    const win = getCurrentWindow();
    win
      .isFullscreen()
      .then((currentFullscreen) => {
        const newFullscreen = !currentFullscreen;
        win
          .setFullscreen(newFullscreen)
          .then(() => {
            setIsFullscreen(newFullscreen);
          })
          .catch(ignoreError);
      })
      .catch(ignoreError);
  };

  return { handleClose, handleMinimize, handleFullscreen };
};

const getIsMac = (): boolean => {
  try {
    const uadDesc = Object.getOwnPropertyDescriptor(navigator, 'userAgentData');
    if (uadDesc && typeof uadDesc.value === 'object') {
      const platformDesc = Object.getOwnPropertyDescriptor(uadDesc.value, 'platform');
      if (platformDesc && typeof platformDesc.value === 'string') {
        return platformDesc.value.toLowerCase().includes('mac');
      }
    }
  } catch {
    // Ignore
  }
  return /mac/i.test(navigator.userAgent);
};

export const Header: Component = () => {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const [isFocused, setIsFocused] = createSignal(true);

  useHeaderEffects(setIsFullscreen, setIsFocused, navigate);
  const { handleClose, handleMinimize, handleFullscreen } = useWindowActions(setIsFullscreen);

  const isMac = createMemo(getIsMac);

  return (
    <header
      data-tauri-drag-region
      class={`h-8 w-full border-b border-border bg-background select-none fixed z-100 transition-opacity ${
        isFullscreen() ? 'opacity-0 hover:opacity-100' : 'opacity-100 rounded-t-2xl'
      }`}
    >
      <div
        class={cn(
          'size-full flex items-center justify-between bg-muted/30 px-3',
          !isFullscreen() && 'rounded-t-2xl',
        )}
      >
        <WindowControls
          isFocused={isFocused()}
          isFullscreen={isFullscreen()}
          onClose={handleClose}
          onMinimize={handleMinimize}
          onFullscreen={handleFullscreen}
        />

        <span class='pointer-events-none absolute left-1/2 -translate-x-1/2 text-sm font-medium text-foreground font-branding'>
          {m.header_app_name()}
        </span>

        <div data-tauri-drag-region={false} class='flex items-center gap-1'>
          <RecordingButton />
          <SystemHealthPopover />
          <SettingsLink isMac={isMac()} />
        </div>
      </div>
    </header>
  );
};

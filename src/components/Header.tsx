import { cn } from '@manafishrov/ui';
import { useNavigate } from '@tanstack/solid-router';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { RecordingButton } from '@/components/header/RecordingButton';
import { SettingsLink } from '@/components/header/SettingsLink';
import { SystemHealthPopover } from '@/components/header/SystemHealthPopover';

function Header() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const [isFocused, setIsFocused] = createSignal(true);

  const updateFullscreenState = async () => {
    const fullscreen = await getCurrentWindow().isFullscreen();
    setIsFullscreen(fullscreen);
  };

  let unlistenFocus: (() => void) | undefined;
  let unlistenResize: (() => void) | undefined;
  let handleKeyDown: ((event: KeyboardEvent) => void) | undefined;

  onMount(async () => {
    const win = getCurrentWindow();
    await updateFullscreenState();
    setIsFocused(await win.isFocused());

    unlistenFocus = await win.onFocusChanged(({ payload }) => {
      setIsFocused(payload);
      setTimeout(() => void updateFullscreenState(), 100);
    });

    unlistenResize = await win.onResized(() => {
      setTimeout(() => void updateFullscreenState(), 100);
    });

    handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        navigate({ to: '/settings' });
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    unlistenFocus?.();
    unlistenResize?.();
    if (handleKeyDown) {
      globalThis.removeEventListener('keydown', handleKeyDown);
    }
  });

  const handleClose = () => {
    void getCurrentWindow().close();
  };

  const handleMinimize = () => {
    void getCurrentWindow().minimize();
  };

  const handleFullscreen = async () => {
    const win = getCurrentWindow();
    const newFullscreen = !(await win.isFullscreen());
    await win.setFullscreen(newFullscreen);
    setIsFullscreen(newFullscreen);
  };

  const isMac = createMemo(() => {
    // @ts-expect-error: Unknown modern API
    const uadPlatform = navigator.userAgentData?.platform;
    if (typeof uadPlatform === 'string') {
      return uadPlatform.toLowerCase().includes('mac');
    }

    return /mac/i.test(navigator.userAgent);
  });

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
        <div data-tauri-drag-region={false} class='group flex items-center gap-2'>
          <button
            tabIndex={-1}
            onClick={handleClose}
            class={`relative flex h-3 w-3 cursor-pointer items-center justify-center rounded-full outline-none transition-colors ${
              isFocused() ? 'bg-[#ff5f57]' : 'bg-border group-hover:bg-[#ff5f57]'
            }`}
            aria-label='Close window'
          >
            <div class='absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100'>
              <span class='absolute inset-0 m-auto h-[1.5px] w-2 rotate-45 rounded-[1px] bg-[#900]'></span>
              <span class='absolute inset-0 m-auto h-[1.5px] w-2 -rotate-45 rounded-[1px] bg-[#900]'></span>
            </div>
          </button>
          <button
            tabIndex={-1}
            onClick={handleMinimize}
            class={`relative flex h-3 w-3 cursor-pointer items-center justify-center rounded-full outline-none transition-colors ${
              isFocused() ? 'bg-[#febc2e]' : 'bg-border group-hover:bg-[#febc2e]'
            }`}
            aria-label='Minimize window'
          >
            <div class='absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100'>
              <span class='absolute inset-0 m-auto h-[1.5px] w-2 rounded-[1px] bg-[#985600]'></span>
            </div>
          </button>
          <button
            tabIndex={-1}
            onClick={handleFullscreen}
            class={`relative flex h-3 w-3 cursor-pointer items-center justify-center rounded-full outline-none transition-colors ${
              isFocused() ? 'bg-[#28c840]' : 'bg-border group-hover:bg-[#28c840]'
            }`}
            aria-label='Toggle fullscreen'
          >
            <div class='absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100'>
              <Show
                when={isFullscreen()}
                fallback={
                  <>
                    <span class='absolute inset-0 m-auto h-[6px] w-[6px] rounded-[1px] bg-[#036200]'></span>
                    <span
                      class={`absolute inset-0 m-auto h-[2px] w-[10px] -rotate-45 rounded-[1px] transition-colors ${
                        isFocused() ? 'bg-[#28c840]' : 'bg-border group-hover:bg-[#28c840]'
                      }`}
                    ></span>
                  </>
                }
              >
                <span
                  class={`absolute inset-0 m-auto h-0 w-0 -translate-x-[2.25px] -translate-y-[2.25px] rounded-[1px] border-b-[4.5px] border-l-[4.5px] border-l-transparent transition-colors ${
                    isFocused()
                      ? 'border-b-[#036200]'
                      : 'border-b-transparent group-hover:border-b-[#036200]'
                  }`}
                ></span>
                <span
                  class={`absolute inset-0 m-auto h-0 w-0 translate-x-[2.25px] translate-y-[2.25px] rounded-[1px] border-r-[4.5px] border-t-[4.5px] border-r-transparent transition-colors ${
                    isFocused()
                      ? 'border-t-[#036200]'
                      : 'border-t-transparent group-hover:border-t-[#036200]'
                  }`}
                ></span>
              </Show>
            </div>
          </button>
        </div>

        <span class='pointer-events-none absolute left-1/2 -translate-x-1/2 text-sm font-medium text-foreground font-branding'>
          Manafish
        </span>

        <div data-tauri-drag-region={false} class='flex items-center gap-1'>
          <RecordingButton />
          <SystemHealthPopover />
          <SettingsLink isMac={isMac()} />
        </div>
      </div>
    </header>
  );
}

export { Header };

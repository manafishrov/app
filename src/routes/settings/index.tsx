import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { getVersion } from '@tauri-apps/api/app';
import { open } from '@tauri-apps/plugin-dialog';
import { useCallback, useEffect, useState } from 'react';

import { type Theme, useTheme } from '@/components/providers/ThemeProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toaster';

import { logError, logWarn } from '@/lib/log';

import {
  type AttitudeIndicator,
  configStore,
  setConfig,
} from '@/stores/config';

async function fetchVersion() {
  try {
    return await getVersion();
  } catch (error) {
    logWarn('Error fetching app version:', error);
  }
}

export const Route = createFileRoute('/settings/')({
  component: General,
  loader: fetchVersion,
});

export function createAnimation(): string {
  return `
    ::view-transition-group(root) {
      animation-timing-function: var(--expo-out);
    }

    ::view-transition-new(root) {
      mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="0" cy="0" r="20" fill="white"/></svg>') top left / 0 no-repeat;
      mask-origin: content-box;
      animation: scale-top-left 1s;
      transform-origin: top left;
    }

    ::view-transition-old(root),
    .dark::view-transition-old(root) {
      animation: scale-top-left 1s;
      transform-origin: top left;
      z-index: -1;
    }

    @keyframes scale-top-left {
      to {
        mask-size: 350vmax;
      }
    }
  `;
}

function General() {
  const config = useStore(configStore, (state) =>
    state
      ? {
          videoDirectory: state.videoDirectory,
          autoUpdate: state.autoUpdate,
          attitudeIndicator: state.attitudeIndicator,
          thrusterRpmOverlay: state.thrusterRpmOverlay,
        }
      : null,
  );
  const appVersion = Route.useLoaderData();
  const { theme, setTheme } = useTheme();

  const [radioSelectedTheme, setRadioSelectedTheme] = useState<Theme>(theme);

  useEffect(() => {
    if (theme !== radioSelectedTheme) {
      setRadioSelectedTheme(theme);
    }
  }, [theme]);

  const styleId = 'theme-transition-styles';

  const updateStyles = useCallback((css: string) => {
    if (typeof window === 'undefined') return;
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = css;
  }, []);

  const setThemeWithAnimation = useCallback(
    (theme: Theme) => {
      const animation = createAnimation();

      updateStyles(animation);

      if (typeof window === 'undefined') return;

      const switchTheme = () => {
        setTheme(theme);
      };

      if (!document.startViewTransition) {
        switchTheme();
        return;
      }

      document.startViewTransition(switchTheme);
    },
    [setTheme, updateStyles],
  );

  if (!config) return;

  async function selectVideoDirectory() {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: 'Select Video Directory',
        defaultPath: config?.videoDirectory,
      });
      if (typeof result === 'string') {
        await setConfig({ videoDirectory: result });
      }
    } catch (error) {
      logError('Error opening file picker dialog:', error);
      toast.error('Failed to open file picker dialog');
    }
  }

  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>General</h1>
        <p className='text-muted-foreground'>
          Generic settings for the Manafish application.
        </p>
      </div>
      <div className='space-y-6'>
        {appVersion && (
          <div>
            <h4 className='text-lg font-medium'>App Version</h4>
            <p className='text-muted-foreground text-sm'>
              Current version of the Manafish application.
            </p>
            <Badge className='bg-primary/10 text-primary mt-2 rounded-full px-3 py-1 text-sm font-medium'>
              v{appVersion}
            </Badge>
          </div>
        )}
        <div>
          <h4 className='text-lg font-medium'>Automatic Updates</h4>
          <p className='text-muted-foreground text-sm'>
            Enable or disable automatic updates on startup.
          </p>
          <div className='mt-2 flex items-center gap-3'>
            <Checkbox
              id='autoUpdate'
              checked={config.autoUpdate ?? false}
              onCheckedChange={() =>
                setConfig({ autoUpdate: !config.autoUpdate })
              }
            />
            <Label htmlFor='autoUpdate'>Enable automatic app updates</Label>
          </div>
        </div>
        <div>
          <h4 className='text-lg font-medium'>Video Directory</h4>
          <p className='text-muted-foreground text-sm'>
            Set the directory where recordings are stored.
          </p>
          <div className='mt-2 flex items-center gap-3'>
            <Input
              readOnly
              value={config.videoDirectory}
              className='w-full max-w-xs'
            />
            <Button
              onClick={selectVideoDirectory}
              aria-label='Select Video Directory'
            >
              Select Directory
            </Button>
          </div>
        </div>
        <div>
          <h3 className='text-2xl font-semibold tracking-tight'>Appearance</h3>
          <div className='mt-4 space-y-6'>
            <div>
              <h4 className='text-lg font-medium'>Theme</h4>
              <p className='text-muted-foreground text-sm'>
                Select the color scheme for the application.
              </p>
              <RadioGroup
                value={radioSelectedTheme}
                onValueChange={(value) => {
                  const next = value as Theme;
                  setRadioSelectedTheme(next);
                  setThemeWithAnimation(next);
                }}
                className='mt-2 space-y-1'
              >
                <div className='flex items-center gap-3'>
                  <RadioGroupItem value='light' id='theme-light' />
                  <Label htmlFor='theme-light'>Light</Label>
                </div>
                <div className='flex items-center gap-3'>
                  <RadioGroupItem value='dark' id='theme-dark' />
                  <Label htmlFor='theme-dark'>Dark</Label>
                </div>
                <div className='flex items-center gap-3'>
                  <RadioGroupItem value='system' id='theme-system' />
                  <Label htmlFor='theme-system'>System</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <h4 className='text-lg font-medium'>Attitude Indicator</h4>
              <p className='text-muted-foreground text-sm'>
                Select the style of the attitude indicator.
              </p>
              <RadioGroup
                value={config.attitudeIndicator}
                onValueChange={(value) =>
                  setConfig({
                    attitudeIndicator: value as AttitudeIndicator,
                  })
                }
                className='mt-2 space-y-1'
              >
                <div className='flex items-center gap-3'>
                  <RadioGroupItem value='scientific' id='ai-scientific' />
                  <Label htmlFor='ai-scientific'>Scientific</Label>
                </div>
                <div className='flex items-center gap-3'>
                  <RadioGroupItem value='dimensional3D' id='ai-3d' />
                  <Label htmlFor='ai-3d'>3D</Label>
                </div>
                <div className='flex items-center gap-3'>
                  <RadioGroupItem value='Disabled' id='ai-disabled' />
                  <Label htmlFor='ai-disabled'>Disabled</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <h4 className='text-lg font-medium'>Thruster RPM Overlay</h4>

              <div className='mt-2 flex items-center gap-2'>
                <Switch
                  id='thruster-rpm-overlay'
                  checked={config.thrusterRpmOverlay ?? false}
                  onCheckedChange={() =>
                    setConfig({
                      thrusterRpmOverlay: !config.thrusterRpmOverlay,
                    })
                  }
                />
                <Label htmlFor='thruster-rpm-overlay'>Enable overlay</Label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

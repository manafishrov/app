import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { open } from '@tauri-apps/plugin-dialog';

import { useTheme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';

import {
  type AttitudeIndicator,
  configStore,
  updateConfig,
} from '@/stores/configStore';

export const Route = createFileRoute('/settings/')({
  component: General,
});

function General() {
  const config = useStore(configStore, (state) => state);
  const { theme, setTheme } = useTheme();

  if (!config) return null;

  async function selectVideoDirectory() {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: 'Select Video Directory',
        defaultPath: config?.videoDirectory,
      });
      if (typeof result === 'string') {
        await updateConfig({ videoDirectory: result });
      }
    } catch (error) {
      console.error('Error opening dialog:', error);
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
                updateConfig({ autoUpdate: !config.autoUpdate })
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
            <Button onClick={selectVideoDirectory}>Select Directory</Button>
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
                value={theme}
                onValueChange={(value) =>
                  setTheme(value as 'light' | 'dark' | 'system')
                }
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
                  updateConfig({
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
                  <RadioGroupItem value='3d' id='ai-3d' />
                  <Label htmlFor='ai-3d'>3D</Label>
                </div>
                <div className='flex items-center gap-3'>
                  <RadioGroupItem value='disabled' id='ai-disabled' />
                  <Label htmlFor='ai-disabled'>Disabled</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import { useConfigStore } from '@/stores/configStore';
import { useEffect } from 'react';

import { VideoStream } from '@/components/VideoStream';
import { GamepadControlsDialog } from '@/components/settings/GamepadControlsDialog';
import { KeyboardControlsDialog } from '@/components/settings/KeyboardControlsDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { DeviceControlsConnection } from '@/components/status/DeviceControlsConnection';
import { WaterSensor } from '@/components/status/WaterSensor';
import { Card } from '@/components/ui/Card';
import { Toaster } from '@/components/ui/Toaster';

function App() {
  const loadConfig = useConfigStore((state) => state.loadConfig);

  useEffect(() => {
    void loadConfig();
  }, []);

  return (
    <main className='mx-auto flex h-full w-full flex-col gap-2 p-4'>
      <Card className='relative w-full overflow-hidden bg-black'>
        <VideoStream />
      </Card>
      <div className='flex justify-between'>
        <div className='flex gap-2'>
          <SettingsDialog />
          <KeyboardControlsDialog />
          <GamepadControlsDialog />
        </div>
        <Card className='flex h-9 items-center justify-center gap-2 rounded-full bg-muted px-2'>
          <WaterSensor />
          <DeviceControlsConnection />
        </Card>
      </div>
      <Toaster />
    </main>
  );
}

export { App };

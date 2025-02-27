import { useConfigStore } from '@/stores/configStore';
import { useEffect } from 'react';

import { ConnectionStatus } from '@/components/ConnectionStatus';
import { GamepadControlsDialog } from '@/components/GamepadControlsDialog';
import { KeyboardControlsDialog } from '@/components/KeyboardControlsDialog';
import { SettingsDialog } from '@/components/SettingsDialog';
import { VideoStream } from '@/components/VideoStream';
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
        <div>
          <ConnectionStatus />
        </div>
      </div>
      <Toaster />
    </main>
  );
}

export { App };

import { useConfigStore } from '@/stores/configStore';
import { useEffect } from 'react';

import { ControllerLayoutDialog } from '@/components/ControllerLayoutDialog';
import { KeyboardLayoutDialog } from '@/components/KeyboardLayoutDialog';
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
      <div className='flex gap-2'>
        <SettingsDialog />
        <KeyboardLayoutDialog />
        <ControllerLayoutDialog />
      </div>
      <Toaster />
    </main>
  );
}

export { App };

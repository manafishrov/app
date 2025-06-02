import { createFileRoute } from '@tanstack/react-router';

import { VideoStream } from '@/components/VideoStream';
import { GamepadBindingsDialog } from '@/components/settings/GamepadBindingsDialog';
import { KeyboardBindingsDialog } from '@/components/settings/KeyboardBindingsDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { Card } from '@/components/ui/Card';

import { useControlInput } from '@/hooks/useControlInput';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  useControlInput();
  return (
    <main className='mx-auto flex h-full w-full flex-col gap-2 p-4'>
      <Card className='relative w-full overflow-hidden bg-black'>
        <VideoStream />
      </Card>
      <div className='flex gap-2'>
        <SettingsDialog />
        <KeyboardBindingsDialog />
        <GamepadBindingsDialog />
      </div>
      <p>UPDATE TEST</p>
    </main>
  );
}

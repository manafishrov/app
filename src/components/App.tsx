import { ControllerLayoutDialog } from '@/components/ControllerLayoutDialog';
import { InputController } from '@/components/InputController';
import { KeyboardLayoutDialog } from '@/components/KeyboardLayoutDialog';
import { VideoStream } from '@/components/VideoStream';
import { Card } from '@/components/ui/Card';

function App() {
  return (
    <main className='mx-auto flex h-full w-full flex-col gap-2 p-4'>
      <Card className='relative w-full overflow-hidden bg-black'>
        <VideoStream />
      </Card>
      <InputController />
      <div className='flex gap-2'>
        <KeyboardLayoutDialog />
        <ControllerLayoutDialog />
      </div>
    </main>
  );
}

export { App };

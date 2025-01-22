import { ControlsDialog } from '@/components/ControlsDialog';
import { VideoStream } from '@/components/VideoStream';
import { Card } from '@/components/ui/Card';

function App() {
  return (
    <main className='mx-auto flex h-full w-full flex-col p-4'>
      <Card className='relative w-full overflow-hidden bg-black'>
        <VideoStream />
        <div className='absolute bottom-2 right-2'>
          <ControlsDialog />
        </div>
      </Card>
    </main>
  );
}

export { App };

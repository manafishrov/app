import { ControlsDialog } from '@/components/ControlsDialog';
import { Card } from '@/components/ui/Card';

function App() {
  return (
    <main className='mx-auto flex h-full w-full flex-col p-4'>
      <Card className='relative w-full bg-black'>
        <div className='aspect-video w-full'>
          <div className='flex h-full w-full items-center justify-center text-muted-foreground'>
            Video Stream
          </div>
        </div>
        <div className='absolute right-2 top-2'>
          <ControlsDialog />
        </div>
      </Card>
    </main>
  );
}

export { App };

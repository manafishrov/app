import { Card } from '@/components/ui/Card';

function App() {
  return (
    <main className='bg-background container mx-auto min-h-screen p-4'>
      <Card className='mb-8 aspect-video w-full bg-black'>
        <div className='text-muted-foreground flex h-full w-full items-center justify-center'>
          Video Stream
        </div>
      </Card>

      <Card className='p-6'>
        <h2 className='mb-4 text-2xl font-bold'>Control Instructions</h2>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <h3 className='mb-2 text-lg font-semibold'>Movement Controls</h3>
            <ul className='space-y-2'>
              <li>
                <span className='bg-secondary rounded px-2 py-1 font-mono'>
                  W
                </span>{' '}
                Move Forward
              </li>
              <li>
                <span className='bg-secondary rounded px-2 py-1 font-mono'>
                  S
                </span>{' '}
                Move Backward
              </li>
              <li>
                <span className='bg-secondary rounded px-2 py-1 font-mono'>
                  A
                </span>{' '}
                Move Left
              </li>
              <li>
                <span className='bg-secondary rounded px-2 py-1 font-mono'>
                  D
                </span>{' '}
                Move Right
              </li>
            </ul>
          </div>
          <div>
            <h3 className='mb-2 text-lg font-semibold'>Rotation Controls</h3>
            <ul className='space-y-2'>
              <li>
                <span className='bg-secondary rounded px-2 py-1 font-mono'>
                  I
                </span>{' '}
                Pitch Up
              </li>
              <li>
                <span className='bg-secondary rounded px-2 py-1 font-mono'>
                  K
                </span>{' '}
                Pitch Down
              </li>
              <li>
                <span className='bg-secondary rounded px-2 py-1 font-mono'>
                  J
                </span>{' '}
                Yaw Left
              </li>
              <li>
                <span className='bg-secondary rounded px-2 py-1 font-mono'>
                  L
                </span>{' '}
                Yaw Right
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </main>
  );
}

export { App };

import { KeyboardIcon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';

function ControlsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='icon'>
          <KeyboardIcon className='h-[1.2rem] w-[1.2rem]' />
          <span className='sr-only'>Show controls</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Controls</DialogTitle>
        </DialogHeader>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div>
            <h3 className='mb-2 text-lg font-semibold'>Movement</h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  W
                </span>{' '}
                Move Forward
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  S
                </span>{' '}
                Move Backward
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  A
                </span>{' '}
                Move Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  D
                </span>{' '}
                Move Right
              </li>
            </ul>
          </div>
          <div>
            <h3 className='mb-2 text-lg font-semibold'>Rotation</h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  I
                </span>{' '}
                Pitch Up
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  K
                </span>{' '}
                Pitch Down
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  J
                </span>{' '}
                Yaw Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  L
                </span>{' '}
                Yaw Right
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ControlsDialog };

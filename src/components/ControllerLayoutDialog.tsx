import { Gamepad2Icon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';

function ControllerLayoutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='icon'>
          <Gamepad2Icon className='h-[1.2rem] w-[1.2rem]' />
          <span className='sr-only'>Show controller layout</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Controller Layout</DialogTitle>
        </DialogHeader>
        <div className='mx-auto grid max-w-2xl grid-cols-1 gap-4 px-4 sm:grid-cols-2'>
          <div>
            <h3 className='mb-2 text-lg font-semibold'>Left Stick</h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  ↑
                </span>{' '}
                Move Forward
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  ↓
                </span>{' '}
                Move Backward
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  ←
                </span>{' '}
                Move Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  →
                </span>{' '}
                Move Right
              </li>
            </ul>
          </div>
          <div>
            <h3 className='mb-2 text-lg font-semibold'>Right Stick</h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  ↑
                </span>{' '}
                Tilt Up
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  ↓
                </span>{' '}
                Tilt Down
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  ←
                </span>{' '}
                Tilt Diagonally Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  →
                </span>{' '}
                Tilt Diagonally Right
              </li>
            </ul>
          </div>
          <div>
            <h3 className='mb-2 text-lg font-semibold'>Shoulder Buttons</h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  L1
                </span>{' '}
                Move Up
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  L2
                </span>{' '}
                Move Down
              </li>
            </ul>
          </div>
          <div>
            <h3 className='mb-2 text-lg font-semibold'>D-Pad</h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  ←
                </span>{' '}
                Rotate Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  →
                </span>{' '}
                Rotate Right
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ControllerLayoutDialog };

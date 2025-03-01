import { useConfigStore } from '@/stores/configStore';
import { KeyboardIcon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';

function KeyboardControlsDialog() {
  const config = useConfigStore((state) => state.config);

  if (!config) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='icon'>
          <KeyboardIcon className='h-[1.2rem] w-[1.2rem]' />
          <span className='sr-only'>Show keyboard layout</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Keyboard layout</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Configure your keyboard bindings for controlling the drone.
        </DialogDescription>
        <div className='mx-auto grid max-w-2xl grid-cols-1 px-4 sm:grid-cols-2'>
          <div className='mx-4'>
            <h3 className='text-md mb-2 mt-4 font-semibold'>Movement</h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.keyboard.moveForward}
                </span>{' '}
                Move Forward
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.keyboard.moveLeft}
                </span>{' '}
                Move Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.keyboard.moveBackward}
                </span>{' '}
                Move Backward
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.keyboard.moveRight}
                </span>{' '}
                Move Right
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.keyboard.moveUp}
                </span>{' '}
                Move Up
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.keyboard.moveDown}
                </span>{' '}
                Move Down
              </li>
            </ul>
          </div>
          <div className='mx-4'>
            <h3 className='text-md mb-2 mt-4 font-semibold'>Pitch & Yaw</h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.keyboard.pitchUp}
                </span>{' '}
                Pitch Up
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.keyboard.yawLeft}
                </span>{' '}
                Yaw Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.keyboard.pitchDown}
                </span>{' '}
                Pitch Down
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.keyboard.yawRight}
                </span>{' '}
                Yaw Right
              </li>
            </ul>
            <h3 className='text-md mb-2 mt-4 font-semibold'>Roll</h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.keyboard.rollLeft}
                </span>{' '}
                Roll Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.keyboard.rollRight}
                </span>{' '}
                Roll Right
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { KeyboardControlsDialog };

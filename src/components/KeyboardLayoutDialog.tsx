import { useConfigStore } from '@/stores/configStore';
import { KeyboardIcon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';

function formatKey(key: string): string {
  if (key === 'arrowup') return '↑';
  if (key === 'arrowdown') return '↓';
  if (key === 'arrowleft') return '←';
  if (key === 'arrowright') return '→';

  return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
}

function KeyboardLayoutDialog() {
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
        <div className='mx-auto grid max-w-2xl grid-cols-1 px-4 sm:grid-cols-2'>
          <div className='mx-4'>
            <h3 className='text-md mb-2 mt-4 font-semibold'>
              Horizontal Movement
            </h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatKey(config.keyboard.moveForward)}
                </span>{' '}
                Move Forward
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatKey(config.keyboard.moveBackward)}
                </span>{' '}
                Move Backward
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatKey(config.keyboard.moveLeft)}
                </span>{' '}
                Move Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatKey(config.keyboard.moveRight)}
                </span>{' '}
                Move Right
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatKey(config.keyboard.rotateLeft)}
                </span>{' '}
                Rotate Left{' '}
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatKey(config.keyboard.rotateRight)}
                </span>{' '}
                Rotate Right{' '}
              </li>
            </ul>
          </div>
          <div className='mx-4'>
            <h3 className='text-md mb-2 mt-4 font-semibold'>
              Vertical Movement
            </h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatKey(config.keyboard.moveUp)}
                </span>{' '}
                Move Up
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatKey(config.keyboard.moveDown)}
                </span>{' '}
                Move Down
              </li>
            </ul>
            <h3 className='text-md mb-2 mt-4 font-semibold'>
              Angle Adjustment
            </h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatKey(config.keyboard.tiltUp)}
                </span>{' '}
                Tilt Up
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatKey(config.keyboard.tiltDown)}
                </span>{' '}
                Tilt Down
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatKey(config.keyboard.tiltDiagonalLeft)}
                </span>{' '}
                Tilt Diagonally Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatKey(config.keyboard.tiltDiagonalRight)}
                </span>{' '}
                Tilt Diagonally Right
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { KeyboardLayoutDialog };

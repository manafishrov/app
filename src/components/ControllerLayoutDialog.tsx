import { useConfigStore } from '@/stores/configStore';
import { Gamepad2Icon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';

function formatAxis(axisNumber: number): string {
  const axisLabels = ['LS-X', 'LS-Y', 'RS-X', 'RS-Y'];
  return axisLabels[axisNumber] ?? `Axis ${axisNumber}`;
}

function formatButton(button: number): string {
  const buttonLabels: Record<number, string> = {
    0: 'A',
    1: 'B',
    2: 'X',
    3: 'Y',
    4: 'LB',
    5: 'RB',
    6: 'LT',
    7: 'RT',
    8: 'Back',
    9: 'Start',
    10: 'LS',
    11: 'RS',
    12: 'D-Up',
    13: 'D-Down',
    14: 'D-Left',
    15: 'D-Right',
  };
  return buttonLabels[button] ?? `Button ${button}`;
}

function ControllerLayoutDialog() {
  const config = useConfigStore((state) => state.config);

  if (!config) return null;

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
        <div className='mx-auto grid max-w-2xl grid-cols-1 px-4 sm:grid-cols-2'>
          <div className='mx-4'>
            <h3 className='text-md mb-2 mt-4 font-semibold'>
              Horizontal Movement
            </h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatAxis(config.controller.leftStick.yAxis)}
                </span>{' '}
                Move Forward
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatAxis(config.controller.leftStick.yAxis)}
                </span>{' '}
                Move Backward
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatAxis(config.controller.leftStick.xAxis)}
                </span>{' '}
                Move Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatAxis(config.controller.leftStick.xAxis)}
                </span>{' '}
                Move Right
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatButton(config.controller.buttons.rotateLeft)}
                </span>{' '}
                Rotate Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatButton(config.controller.buttons.rotateRight)}
                </span>{' '}
                Rotate Right
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
                  {formatButton(config.controller.buttons.moveUp)}
                </span>{' '}
                Move Up
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatButton(config.controller.buttons.moveDown)}
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
                  {formatAxis(config.controller.rightStick.yAxis)}
                </span>{' '}
                Tilt Up
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatAxis(config.controller.rightStick.yAxis)}
                </span>{' '}
                Tilt Down
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatAxis(config.controller.rightStick.xAxis)}
                </span>{' '}
                Tilt Diagonally Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {formatAxis(config.controller.rightStick.xAxis)}
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

export { ControllerLayoutDialog };

import { useConfigStore } from '@/stores/configStore';
import { Gamepad2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import 'tauri-plugin-gamepad-api';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';

function GamepadControlsDialog() {
  const config = useConfigStore((state) => state.config);
  const [isControllerConnected, setIsControllerConnected] = useState(false);

  useEffect(() => {
    const handleGamepadConnected = () => setIsControllerConnected(true);
    const handleGamepadDisconnected = () => setIsControllerConnected(false);

    const gamepads = navigator.getGamepads();
    setIsControllerConnected(
      Array.from(gamepads).some((gamepad) => gamepad !== null),
    );

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener(
        'gamepaddisconnected',
        handleGamepadDisconnected,
      );
    };
  }, []);

  if (!config) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='icon'>
          <Gamepad2Icon
            className={`h-[1.2rem] w-[1.2rem] ${
              isControllerConnected && 'text-primary'
            }`}
          />
          <span className='sr-only'>Show gamepad layout</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Gamepad Layout</DialogTitle>
        </DialogHeader>

        <DialogDescription>
          Configure your gamepad bindings for controlling the drone.
        </DialogDescription>
        <div className='mx-auto grid max-w-2xl grid-cols-1 px-4 sm:grid-cols-2'>
          <div className='mx-4'>
            <h3 className='text-md mb-2 mt-4 font-semibold'>Movement</h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.gamepad.moveHorizontal}
                </span>{' '}
                Move Horizontal
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.gamepad.moveUp}
                </span>{' '}
                Move Up
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.gamepad.moveDown}
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
                  {config.gamepad.pitchYaw}
                </span>{' '}
                Pitch/Yaw
              </li>
            </ul>
            <h3 className='text-md mb-2 mt-4 font-semibold'>Roll</h3>
            <ul className='space-y-2'>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.gamepad.rollLeft}
                </span>{' '}
                Roll Left
              </li>
              <li>
                <span className='rounded bg-secondary px-2 py-1 font-mono'>
                  {config.gamepad.rollRight}
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

export { GamepadControlsDialog };

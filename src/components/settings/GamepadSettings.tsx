import { useStore } from '@tanstack/react-store';
import { Gamepad2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { GamepadBindInput } from '@/components/composites/GamepadBindInput';

import { type GamepadBindings, configStore, setConfig } from '@/stores/config';

const DEFAULT_GAMEPAD_BINDINGS: GamepadBindings = {
  moveHorizontal: 'leftStick',
  moveUp: '7',
  moveDown: '6',
  pitchYaw: 'rightStick',
  rollLeft: '4',
  rollRight: '5',
  stabilizePitch: '0',
  stabilizeRoll: '0',
  stabilizeDepth: '1',
  record: '9',
};

function GamepadSettings() {
  const gamepad = useStore(configStore, (state) => state?.gamepad);
  const [isControllerConnected, setIsControllerConnected] = useState(() => {
    const gamepads = navigator.getGamepads();
    return Array.from(gamepads).some((gamepad) => gamepad !== null);
  });

  useEffect(() => {
    const handleGamepadConnected = () => setIsControllerConnected(true);
    const handleGamepadDisconnected = () => setIsControllerConnected(false);

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

  if (!gamepad) return;

  if (!isControllerConnected) {
    return (
      <div className='border-muted bg-muted/20 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center'>
        <Gamepad2Icon className='text-muted-foreground h-12 w-12' />
        <h3 className='text-muted-foreground mt-4 text-lg font-semibold'>
          No Gamepad Connected
        </h3>
        <p className='text-muted-foreground mt-2 text-sm'>
          Please connect a gamepad to configure the bindings.
        </p>
      </div>
    );
  }

  async function handleBindingChange(
    key: keyof GamepadBindings,
    value: string,
  ) {
    if (!gamepad) return;

    const newGamepad = {
      ...gamepad,
      [key]: value,
    };

    await setConfig({ gamepad: newGamepad });
  }

  return (
    <div className='xs:grid-cols-2 grid grid-cols-1 gap-x-8'>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>Movement</h3>
          <GamepadBindInput
            label='Move Horizontal'
            bind={gamepad.moveHorizontal}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.moveHorizontal}
            onBindChange={(newBind) =>
              handleBindingChange('moveHorizontal', newBind)
            }
            isJoystick
          />
          <GamepadBindInput
            label='Move Up'
            bind={gamepad.moveUp}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.moveUp}
            onBindChange={(newBind) => handleBindingChange('moveUp', newBind)}
          />
          <GamepadBindInput
            label='Move Down'
            bind={gamepad.moveDown}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.moveDown}
            onBindChange={(newBind) => handleBindingChange('moveDown', newBind)}
          />
        </div>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>
            Stabilization
          </h3>
          <GamepadBindInput
            label='Stabilize Pitch'
            bind={gamepad.stabilizePitch}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.stabilizePitch}
            onBindChange={(newBind) =>
              handleBindingChange('stabilizePitch', newBind)
            }
          />
          <GamepadBindInput
            label='Stabilize Roll'
            bind={gamepad.stabilizeRoll}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.stabilizeRoll}
            onBindChange={(newBind) =>
              handleBindingChange('stabilizeRoll', newBind)
            }
          />
          <GamepadBindInput
            label='Stabilize Depth'
            bind={gamepad.stabilizeDepth}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.stabilizeDepth}
            onBindChange={(newBind) =>
              handleBindingChange('stabilizeDepth', newBind)
            }
          />
        </div>
      </div>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>Pitch & Yaw</h3>
          <GamepadBindInput
            label='Pitch/Yaw'
            bind={gamepad.pitchYaw}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.pitchYaw}
            onBindChange={(newBind) => handleBindingChange('pitchYaw', newBind)}
            isJoystick
          />
        </div>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>Roll</h3>
          <GamepadBindInput
            label='Roll Left'
            bind={gamepad.rollLeft}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.rollLeft}
            onBindChange={(newBind) => handleBindingChange('rollLeft', newBind)}
          />
          <GamepadBindInput
            label='Roll Right'
            bind={gamepad.rollRight}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.rollRight}
            onBindChange={(newBind) =>
              handleBindingChange('rollRight', newBind)
            }
          />
        </div>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>Actions</h3>
          <GamepadBindInput
            label='Record'
            bind={gamepad.record}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.record}
            onBindChange={(newBind) => handleBindingChange('record', newBind)}
          />
        </div>
      </div>
    </div>
  );
}

export { GamepadSettings };

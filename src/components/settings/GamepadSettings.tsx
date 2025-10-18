import { useStore } from '@tanstack/react-store';
import { Gamepad2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { GamepadBindInput } from '@/components/composites/GamepadBindInput';

import { type GamepadBindings, configStore, setConfig } from '@/stores/config';

const DEFAULT_GAMEPAD_BINDINGS: GamepadBindings = {
  surgeSway: 'leftStick',
  heaveUp: '7',
  heaveDown: '6',
  pitchYaw: 'rightStick',
  rollLeft: '4',
  rollRight: '5',
  action1Positive: '0',
  action1Negative: '1',
  action2Positive: '2',
  action2Negative: '3',
  stabilizePitch: '12',
  stabilizeRoll: '12',
  stabilizeDepth: '13',
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
            label='Surge/Sway'
            bind={gamepad.surgeSway}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.surgeSway}
            onBindChange={(newBind) =>
              handleBindingChange('surgeSway', newBind)
            }
            isJoystick
          />
          <GamepadBindInput
            label='Heave Up'
            bind={gamepad.heaveUp}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.heaveUp}
            onBindChange={(newBind) => handleBindingChange('heaveUp', newBind)}
          />
          <GamepadBindInput
            label='Heave Down'
            bind={gamepad.heaveDown}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.heaveDown}
            onBindChange={(newBind) => handleBindingChange('heaveDown', newBind)}
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
            label='Action 1 Positive'
            bind={gamepad.action1Positive}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.action1Positive}
            onBindChange={(newBind) =>
              handleBindingChange('action1Positive', newBind)
            }
          />
          <GamepadBindInput
            label='Action 1 Negative'
            bind={gamepad.action1Negative}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.action2Negative}
            onBindChange={(newBind) =>
              handleBindingChange('action1Negative', newBind)
            }
          />
          <GamepadBindInput
            label='Action 2 Positive'
            bind={gamepad.action2Positive}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.action2Positive}
            onBindChange={(newBind) =>
              handleBindingChange('action2Positive', newBind)
            }
          />
          <GamepadBindInput
            label='Action 2 Negative'
            bind={gamepad.action2Negative}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.action2Negative}
            onBindChange={(newBind) =>
              handleBindingChange('action2Negative', newBind)
            }
          />
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

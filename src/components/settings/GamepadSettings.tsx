import { useStore } from '@tanstack/react-store';
import { Gamepad2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { GamepadBindInput } from '@/components/composites/GamepadBindInput';

import {
  type GamepadBindings,
  configStore,
  updateConfig,
} from '@/stores/configStore';

const DEFAULT_GAMEPAD_BINDINGS: GamepadBindings = {
  moveHorizontal: 'leftStick',
  moveUp: '7',
  moveDown: '6',
  pitchYaw: 'rightStick',
  rollLeft: '4',
  rollRight: '5',
  action1: '0',
  action2: '1',
  stabilizePitch: '12',
  stabilizeRoll: '15',
  stabilizeDepth: '13',
  record: '9',
};

function GamepadSettings() {
  const config = useStore(configStore);
  const [localBindings, setLocalBindings] = useState<GamepadBindings | null>(
    null,
  );
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

  if (!config) return;

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

  const currentBindings = localBindings ?? config.gamepad;

  async function handleBindingChange(
    key: keyof GamepadBindings,
    value: string,
  ) {
    const newBindings = {
      ...currentBindings,
      [key]: value,
    };

    setLocalBindings(newBindings);
    await updateConfig({ gamepad: newBindings });
  }

  return (
    <div className='xs:grid-cols-2 grid grid-cols-1 gap-x-8'>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>Movement</h3>
          <GamepadBindInput
            label='Move Horizontal'
            bind={currentBindings.moveHorizontal}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.moveHorizontal}
            onBindChange={(newBind) =>
              handleBindingChange('moveHorizontal', newBind)
            }
            isJoystick
          />
          <GamepadBindInput
            label='Move Up'
            bind={currentBindings.moveUp}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.moveUp}
            onBindChange={(newBind) => handleBindingChange('moveUp', newBind)}
          />
          <GamepadBindInput
            label='Move Down'
            bind={currentBindings.moveDown}
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
            bind={currentBindings.stabilizePitch}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.stabilizePitch}
            onBindChange={(newBind) =>
              handleBindingChange('stabilizePitch', newBind)
            }
          />
          <GamepadBindInput
            label='Stabilize Roll'
            bind={currentBindings.stabilizeRoll}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.stabilizeRoll}
            onBindChange={(newBind) =>
              handleBindingChange('stabilizeRoll', newBind)
            }
          />
          <GamepadBindInput
            label='Stabilize Depth'
            bind={currentBindings.stabilizeDepth}
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
            bind={currentBindings.pitchYaw}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.pitchYaw}
            onBindChange={(newBind) => handleBindingChange('pitchYaw', newBind)}
            isJoystick
          />
        </div>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>Roll</h3>
          <GamepadBindInput
            label='Roll Left'
            bind={currentBindings.rollLeft}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.rollLeft}
            onBindChange={(newBind) => handleBindingChange('rollLeft', newBind)}
          />
          <GamepadBindInput
            label='Roll Right'
            bind={currentBindings.rollRight}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.rollRight}
            onBindChange={(newBind) =>
              handleBindingChange('rollRight', newBind)
            }
          />
        </div>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>Actions</h3>
          <GamepadBindInput
            label='Action 1'
            bind={currentBindings.action1}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.action1}
            onBindChange={(newBind) => handleBindingChange('action1', newBind)}
          />
          <GamepadBindInput
            label='Action 2'
            bind={currentBindings.action2}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.action2}
            onBindChange={(newBind) => handleBindingChange('action2', newBind)}
          />
          <GamepadBindInput
            label='Record'
            bind={currentBindings.record}
            defaultBind={DEFAULT_GAMEPAD_BINDINGS.record}
            onBindChange={(newBind) => handleBindingChange('record', newBind)}
          />
        </div>
      </div>
    </div>
  );
}

export { GamepadSettings };

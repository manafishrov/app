import { useStore } from '@tanstack/react-store';
import { Gamepad2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { GamepadBindInput } from '@/components/composites/GamepadBindInput';
import { toast } from '@/components/ui/Toaster';

import {
  type GamepadBindings,
  configStore,
  updateGamepadBindings,
} from '@/stores/configStore';

const DEFAULT_GAMEPAD_BINDINGS: GamepadBindings = {
  moveHorizontal: 'LeftStick',
  moveUp: '7',
  moveDown: '6',
  pitchYaw: 'RightStick',
  rollLeft: '4',
  rollRight: '5',
  action1: '0',
  action2: '1',
  stabilizePitch: '12',
  stabilizeRoll: '13',
  stabilizeDepth: '14',
  record: '9',
};

function GamepadSettings() {
  const config = useStore(configStore, (state) => state);
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

  if (!config) return null;

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

    try {
      await updateGamepadBindings(newBindings);
      toast.success('Gamepad binding updated');
    } catch (error) {
      console.error('Failed to update gamepad binding:', error);
      toast.error('Failed to update gamepad binding');
    }
  }

  return (
    <>
      <h3 className='text-md mt-4 mb-2 font-semibold'>Movement</h3>
      <div className='space-y-2'>
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
      <h3 className='text-md mt-4 mb-2 font-semibold'>Stabilization</h3>
      <div className='space-y-2'>
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
      <h3 className='text-md mt-4 mb-2 font-semibold'>Pitch & Yaw</h3>
      <div className='space-y-2'>
        <GamepadBindInput
          label='Pitch/Yaw'
          bind={currentBindings.pitchYaw}
          defaultBind={DEFAULT_GAMEPAD_BINDINGS.pitchYaw}
          onBindChange={(newBind) => handleBindingChange('pitchYaw', newBind)}
          isJoystick
        />
      </div>
      <h3 className='text-md mt-4 mb-2 font-semibold'>Roll</h3>
      <div className='space-y-2'>
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
          onBindChange={(newBind) => handleBindingChange('rollRight', newBind)}
        />
      </div>
      <h3 className='text-md mt-4 mb-2 font-semibold'>Misc</h3>
      <div className='space-y-2'>
        <GamepadBindInput
          label='Record'
          bind={currentBindings.record}
          defaultBind={DEFAULT_GAMEPAD_BINDINGS.record}
          onBindChange={(newBind) => handleBindingChange('record', newBind)}
        />
      </div>
    </>
  );
}

export { GamepadSettings };

import { useStore } from '@tanstack/react-store';
import { useState } from 'react';

import { KeyboardBindInput } from '@/components/composites/KeyboardBindInput';
import { toast } from '@/components/ui/Toaster';

import {
  type KeyboardBindings,
  configStore,
  updateKeyboardBindings,
} from '@/stores/configStore';

const DEFAULT_KEYBOARD_BINDINGS: KeyboardBindings = {
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  moveUp: 'Space',
  moveDown: 'ShiftLeft',
  pitchUp: 'KeyI',
  pitchDown: 'KeyK',
  yawLeft: 'KeyJ',
  yawRight: 'KeyL',
  rollLeft: 'KeyQ',
  rollRight: 'KeyE',
  action1: 'KeyU',
  action2: 'KeyO',
  stabilizePitch: 'Digit1',
  stabilizeRoll: 'Digit2',
  stabilizeDepth: 'Digit3',
  record: 'KeyR',
};

function KeyboardSettings() {
  const config = useStore(configStore, (state) => state);
  const [localBindings, setLocalBindings] = useState<KeyboardBindings | null>(
    null,
  );

  if (!config) return null;

  const currentBindings = localBindings ?? config.keyboard;

  async function handleBindingChange(
    key: keyof KeyboardBindings,
    value: string,
  ) {
    const newBindings = {
      ...currentBindings,
      [key]: value,
    };

    setLocalBindings(newBindings);

    try {
      await updateKeyboardBindings(newBindings);
      toast.success('Keybinding updated');
    } catch (error) {
      console.error('Failed to update keybinding:', error);
      toast.error('Failed to update keybinding');
    }
  }

  return (
    <>
      <h3 className='text-md mt-4 mb-2 font-semibold'>Movement</h3>
      <div className='space-y-2'>
        <KeyboardBindInput
          label='Move Forward'
          bind={currentBindings.moveForward}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveForward}
          onBindChange={(newBind) =>
            handleBindingChange('moveForward', newBind)
          }
        />
        <KeyboardBindInput
          label='Move Left'
          bind={currentBindings.moveLeft}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveLeft}
          onBindChange={(newBind) => handleBindingChange('moveLeft', newBind)}
        />
        <KeyboardBindInput
          label='Move Backward'
          bind={currentBindings.moveBackward}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveBackward}
          onBindChange={(newBind) =>
            handleBindingChange('moveBackward', newBind)
          }
        />
        <KeyboardBindInput
          label='Move Right'
          bind={currentBindings.moveRight}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveRight}
          onBindChange={(newBind) => handleBindingChange('moveRight', newBind)}
        />
        <KeyboardBindInput
          label='Move Up'
          bind={currentBindings.moveUp}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveUp}
          onBindChange={(newBind) => handleBindingChange('moveUp', newBind)}
        />
        <KeyboardBindInput
          label='Move Down'
          bind={currentBindings.moveDown}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveDown}
          onBindChange={(newBind) => handleBindingChange('moveDown', newBind)}
        />
      </div>
      <h3 className='text-md mt-4 mb-2 font-semibold'>Stabilization</h3>
      <div className='space-y-2'>
        <KeyboardBindInput
          label='Stabilize Pitch'
          bind={currentBindings.stabilizePitch}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.stabilizePitch}
          onBindChange={(newBind) =>
            handleBindingChange('stabilizePitch', newBind)
          }
        />
        <KeyboardBindInput
          label='Stabilize Roll'
          bind={currentBindings.stabilizeRoll}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.stabilizeRoll}
          onBindChange={(newBind) =>
            handleBindingChange('stabilizeRoll', newBind)
          }
        />
        <KeyboardBindInput
          label='Stabilize Depth'
          bind={currentBindings.stabilizeDepth}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.stabilizeDepth}
          onBindChange={(newBind) =>
            handleBindingChange('stabilizeDepth', newBind)
          }
        />
      </div>
      <h3 className='text-md mt-4 mb-2 font-semibold'>Pitch & Yaw</h3>
      <div className='space-y-2'>
        <KeyboardBindInput
          label='Pitch Up'
          bind={currentBindings.pitchUp}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.pitchUp}
          onBindChange={(newBind) => handleBindingChange('pitchUp', newBind)}
        />
        <KeyboardBindInput
          label='Yaw Left'
          bind={currentBindings.yawLeft}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.yawLeft}
          onBindChange={(newBind) => handleBindingChange('yawLeft', newBind)}
        />
        <KeyboardBindInput
          label='Pitch Down'
          bind={currentBindings.pitchDown}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.pitchDown}
          onBindChange={(newBind) => handleBindingChange('pitchDown', newBind)}
        />
        <KeyboardBindInput
          label='Yaw Right'
          bind={currentBindings.yawRight}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.yawRight}
          onBindChange={(newBind) => handleBindingChange('yawRight', newBind)}
        />
      </div>
      <h3 className='text-md mt-4 mb-2 font-semibold'>Roll</h3>
      <div className='space-y-2'>
        <KeyboardBindInput
          label='Roll Left'
          bind={currentBindings.rollLeft}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.rollLeft}
          onBindChange={(newBind) => handleBindingChange('rollLeft', newBind)}
        />
        <KeyboardBindInput
          label='Roll Right'
          bind={currentBindings.rollRight}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.rollRight}
          onBindChange={(newBind) => handleBindingChange('rollRight', newBind)}
        />
      </div>
      <h3 className='text-md mt-4 mb-2 font-semibold'>Misc</h3>
      <div className='space-y-2'>
        <KeyboardBindInput
          label='Record'
          bind={currentBindings.record}
          defaultBind={DEFAULT_KEYBOARD_BINDINGS.record}
          onBindChange={(newBind) => handleBindingChange('record', newBind)}
        />
      </div>
    </>
  );
}

export { KeyboardSettings };

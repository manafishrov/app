import { useStore } from '@tanstack/react-store';

import { KeyboardBindInput } from '@/components/composites/KeyboardBindInput';

import { type KeyboardBindings, configStore, setConfig } from '@/stores/config';

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
  stabilizePitch: 'KeyU',
  stabilizeRoll: 'KeyU',
  stabilizeDepth: 'KeyO',
  record: 'KeyR',
};

function KeyboardSettings() {
  const keyboard = useStore(configStore, (state) => state?.keyboard);

  async function handleBindingChange(
    key: keyof KeyboardBindings,
    value: string,
  ) {
    if (!keyboard) return;

    const newKeyboard = {
      ...keyboard,
      [key]: value,
    };

    await setConfig({ keyboard: newKeyboard });
  }

  if (!keyboard) return;

  return (
    <div className='xs:grid-cols-2 grid grid-cols-1 gap-x-8'>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>Movement</h3>
          <KeyboardBindInput
            label='Move Forward'
            bind={keyboard.moveForward}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveForward}
            onBindChange={(newBind) =>
              handleBindingChange('moveForward', newBind)
            }
          />
          <KeyboardBindInput
            label='Move Left'
            bind={keyboard.moveLeft}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveLeft}
            onBindChange={(newBind) => handleBindingChange('moveLeft', newBind)}
          />
          <KeyboardBindInput
            label='Move Backward'
            bind={keyboard.moveBackward}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveBackward}
            onBindChange={(newBind) =>
              handleBindingChange('moveBackward', newBind)
            }
          />
          <KeyboardBindInput
            label='Move Right'
            bind={keyboard.moveRight}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveRight}
            onBindChange={(newBind) =>
              handleBindingChange('moveRight', newBind)
            }
          />
          <KeyboardBindInput
            label='Move Up'
            bind={keyboard.moveUp}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveUp}
            onBindChange={(newBind) => handleBindingChange('moveUp', newBind)}
          />
          <KeyboardBindInput
            label='Move Down'
            bind={keyboard.moveDown}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveDown}
            onBindChange={(newBind) => handleBindingChange('moveDown', newBind)}
          />
        </div>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>
            Stabilization
          </h3>
          <KeyboardBindInput
            label='Stabilize Pitch'
            bind={keyboard.stabilizePitch}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.stabilizePitch}
            onBindChange={(newBind) =>
              handleBindingChange('stabilizePitch', newBind)
            }
          />
          <KeyboardBindInput
            label='Stabilize Roll'
            bind={keyboard.stabilizeRoll}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.stabilizeRoll}
            onBindChange={(newBind) =>
              handleBindingChange('stabilizeRoll', newBind)
            }
          />
          <KeyboardBindInput
            label='Stabilize Depth'
            bind={keyboard.stabilizeDepth}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.stabilizeDepth}
            onBindChange={(newBind) =>
              handleBindingChange('stabilizeDepth', newBind)
            }
          />
        </div>
      </div>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>Pitch & Yaw</h3>
          <KeyboardBindInput
            label='Pitch Up'
            bind={keyboard.pitchUp}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.pitchUp}
            onBindChange={(newBind) => handleBindingChange('pitchUp', newBind)}
          />
          <KeyboardBindInput
            label='Yaw Left'
            bind={keyboard.yawLeft}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.yawLeft}
            onBindChange={(newBind) => handleBindingChange('yawLeft', newBind)}
          />
          <KeyboardBindInput
            label='Pitch Down'
            bind={keyboard.pitchDown}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.pitchDown}
            onBindChange={(newBind) =>
              handleBindingChange('pitchDown', newBind)
            }
          />
          <KeyboardBindInput
            label='Yaw Right'
            bind={keyboard.yawRight}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.yawRight}
            onBindChange={(newBind) => handleBindingChange('yawRight', newBind)}
          />
        </div>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>Roll</h3>
          <KeyboardBindInput
            label='Roll Left'
            bind={keyboard.rollLeft}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.rollLeft}
            onBindChange={(newBind) => handleBindingChange('rollLeft', newBind)}
          />
          <KeyboardBindInput
            label='Roll Right'
            bind={keyboard.rollRight}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.rollRight}
            onBindChange={(newBind) =>
              handleBindingChange('rollRight', newBind)
            }
          />
        </div>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold tracking-tight'>Actions</h3>
          <KeyboardBindInput
            label='Record'
            bind={keyboard.record}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.record}
            onBindChange={(newBind) => handleBindingChange('record', newBind)}
          />
        </div>
      </div>
    </div>
  );
}

export { KeyboardSettings };

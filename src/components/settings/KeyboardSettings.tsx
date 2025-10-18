import { useStore } from '@tanstack/react-store';

import { KeyboardBindInput } from '@/components/composites/KeyboardBindInput';

import { type KeyboardBindings, configStore, setConfig } from '@/stores/config';

const DEFAULT_KEYBOARD_BINDINGS: KeyboardBindings = {
  surgeForward: 'KeyW',
  surgeBackward: 'KeyS',
  swayLeft: 'KeyA',
  swayRight: 'KeyD',
  heaveUp: 'Space',
  heaveDown: 'ShiftLeft',
  pitchUp: 'KeyI',
  pitchDown: 'KeyK',
  yawLeft: 'KeyJ',
  yawRight: 'KeyL',
  rollLeft: 'KeyQ',
  rollRight: 'KeyE',
  action1Positive: 'Digit1',
  action1Negative: 'Digit2',
  action2Positive: 'Digit3',
  action2Negative: 'Digit4',
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
            label='Surge Forward'
            bind={keyboard.surgeForward}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.surgeForward}
            onBindChange={(newBind) =>
              handleBindingChange('surgeForward', newBind)
            }
          />
          <KeyboardBindInput
            label='Sway Left'
            bind={keyboard.swayLeft}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.swayLeft}
            onBindChange={(newBind) => handleBindingChange('swayLeft', newBind)}
          />
          <KeyboardBindInput
            label='Surge Backward'
            bind={keyboard.surgeBackward}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.surgeBackward}
            onBindChange={(newBind) =>
              handleBindingChange('surgeBackward', newBind)
            }
          />
          <KeyboardBindInput
            label='Sway Right'
            bind={keyboard.swayRight}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.swayRight}
            onBindChange={(newBind) =>
              handleBindingChange('swayRight', newBind)
            }
          />
          <KeyboardBindInput
            label='Heave Up'
            bind={keyboard.heaveUp}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.heaveUp}
            onBindChange={(newBind) => handleBindingChange('heaveUp', newBind)}
          />
          <KeyboardBindInput
            label='Heave Down'
            bind={keyboard.heaveDown}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.heaveDown}
            onBindChange={(newBind) =>
              handleBindingChange('heaveDown', newBind)
            }
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
            label='Action 1 Positive'
            bind={keyboard.action1Positive}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.action1Positive}
            onBindChange={(newBind) =>
              handleBindingChange('action1Positive', newBind)
            }
          />
          <KeyboardBindInput
            label='Action 1 Negative'
            bind={keyboard.action1Negative}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.action2Negative}
            onBindChange={(newBind) =>
              handleBindingChange('action1Negative', newBind)
            }
          />
          <KeyboardBindInput
            label='Action 2 Positive'
            bind={keyboard.action2Positive}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.action2Positive}
            onBindChange={(newBind) =>
              handleBindingChange('action2Positive', newBind)
            }
          />
          <KeyboardBindInput
            label='Action 2 Negative'
            bind={keyboard.action2Negative}
            defaultBind={DEFAULT_KEYBOARD_BINDINGS.action2Negative}
            onBindChange={(newBind) =>
              handleBindingChange('action2Negative', newBind)
            }
          />
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

import { type KeyboardBindings, useConfigStore } from '@/stores/configStore';
import { KeyboardIcon } from 'lucide-react';
import { useState } from 'react';

import { KeyboardBindInput } from '@/components/composites/KeyboardBindInput';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toaster';

const DEFAULT_KEYBOARD_BINDINGS: KeyboardBindings = {
  moveForward: 'W',
  moveBackward: 'S',
  moveLeft: 'A',
  moveRight: 'D',
  moveUp: 'Space',
  moveDown: 'Shift',
  pitchUp: 'I',
  pitchDown: 'K',
  yawLeft: 'J',
  yawRight: 'L',
  rollLeft: 'Q',
  rollRight: 'E',
};

function KeyboardControlsDialog() {
  const config = useConfigStore((state) => state.config);
  const updateKeyboardBindings = useConfigStore(
    (state) => state.updateKeyboardBindings,
  );
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
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='icon'>
          <KeyboardIcon className='h-[1.2rem] w-[1.2rem]' />
          <span className='sr-only'>Show keyboard layout</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[90vh] overflow-y-auto focus-visible:outline-none'>
        <DialogHeader>
          <DialogTitle>Keyboard layout</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Configure your keyboard bindings for controlling the drone.
        </DialogDescription>
        <div className='mx-auto grid max-w-2xl grid-cols-1 sm:grid-cols-2'>
          <div className='mx-4'>
            <h3 className='text-md mb-2 mt-4 font-semibold'>Movement</h3>
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
                onBindChange={(newBind) =>
                  handleBindingChange('moveLeft', newBind)
                }
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
                onBindChange={(newBind) =>
                  handleBindingChange('moveRight', newBind)
                }
              />
              <KeyboardBindInput
                label='Move Up'
                bind={currentBindings.moveUp}
                defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveUp}
                onBindChange={(newBind) =>
                  handleBindingChange('moveUp', newBind)
                }
              />
              <KeyboardBindInput
                label='Move Down'
                bind={currentBindings.moveDown}
                defaultBind={DEFAULT_KEYBOARD_BINDINGS.moveDown}
                onBindChange={(newBind) =>
                  handleBindingChange('moveDown', newBind)
                }
              />
            </div>
          </div>
          <div className='mx-4'>
            <h3 className='text-md mb-2 mt-4 font-semibold'>Pitch & Yaw</h3>
            <div className='space-y-2'>
              <KeyboardBindInput
                label='Pitch Up'
                bind={currentBindings.pitchUp}
                defaultBind={DEFAULT_KEYBOARD_BINDINGS.pitchUp}
                onBindChange={(newBind) =>
                  handleBindingChange('pitchUp', newBind)
                }
              />
              <KeyboardBindInput
                label='Yaw Left'
                bind={currentBindings.yawLeft}
                defaultBind={DEFAULT_KEYBOARD_BINDINGS.yawLeft}
                onBindChange={(newBind) =>
                  handleBindingChange('yawLeft', newBind)
                }
              />
              <KeyboardBindInput
                label='Pitch Down'
                bind={currentBindings.pitchDown}
                defaultBind={DEFAULT_KEYBOARD_BINDINGS.pitchDown}
                onBindChange={(newBind) =>
                  handleBindingChange('pitchDown', newBind)
                }
              />
              <KeyboardBindInput
                label='Yaw Right'
                bind={currentBindings.yawRight}
                defaultBind={DEFAULT_KEYBOARD_BINDINGS.yawRight}
                onBindChange={(newBind) =>
                  handleBindingChange('yawRight', newBind)
                }
              />
            </div>
            <h3 className='text-md mb-2 mt-4 font-semibold'>Roll</h3>
            <div className='space-y-2'>
              <KeyboardBindInput
                label='Roll Left'
                bind={currentBindings.rollLeft}
                defaultBind={DEFAULT_KEYBOARD_BINDINGS.rollLeft}
                onBindChange={(newBind) =>
                  handleBindingChange('rollLeft', newBind)
                }
              />
              <KeyboardBindInput
                label='Roll Right'
                bind={currentBindings.rollRight}
                defaultBind={DEFAULT_KEYBOARD_BINDINGS.rollRight}
                onBindChange={(newBind) =>
                  handleBindingChange('rollRight', newBind)
                }
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { KeyboardControlsDialog };

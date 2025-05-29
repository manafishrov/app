import { Gamepad2Icon, RotateCcwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

import { cx } from '@/lib/utils';

type GamepadBindInputProps = {
  label: string;
  bind: string;
  defaultBind: string;
  onBindChange: (newBind: string) => void;
  isJoystick?: boolean;
};

const mappings: Record<string, string> = {
  0: 'A / ×',
  1: 'B / ○',
  2: 'X / □',
  3: 'Y / △',
  4: 'LB / L1',
  5: 'RB / R1',
  6: 'LT / L2',
  7: 'RT / R2',
  8: 'Back / Share',
  9: 'Start / Options',
  10: 'L3',
  11: 'R3',
  12: 'DPad Up',
  13: 'DPad Down',
  14: 'DPad Left',
  15: 'DPad Right',
  16: 'Xbox / PS Button',
  LeftStick: 'Left Stick',
  RightStick: 'Right Stick',
  DPad: 'D-Pad',
  FaceButtons: 'Face Buttons',
};

function GamepadBindInput({
  label,
  bind,
  defaultBind,
  onBindChange,
  isJoystick = false,
}: GamepadBindInputProps) {
  const [currentBind, setCurrentBind] = useState(bind);
  const [isRecording, setIsRecording] = useState(false);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const updateGamepadConnection = () => {
    if (!navigator.getGamepads) return;

    const gamepads = navigator.getGamepads();
    const hasConnectedGamepad = Array.from(gamepads).some(
      (gamepad) => gamepad !== null,
    );
    // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    setGamepadConnected(hasConnectedGamepad);
  };

  useEffect(() => {
    if (!navigator.getGamepads) {
      return;
    }

    updateGamepadConnection();

    window.addEventListener('gamepadconnected', updateGamepadConnection);
    window.addEventListener('gamepaddisconnected', updateGamepadConnection);

    return () => {
      window.removeEventListener('gamepadconnected', updateGamepadConnection);
      window.removeEventListener(
        'gamepaddisconnected',
        updateGamepadConnection,
      );
    };
  }, []);

  useEffect(() => {
    if (!isRecording || !gamepadConnected) return;

    function checkGamepadInput() {
      const gamepads = navigator.getGamepads();

      for (const gamepad of gamepads) {
        if (!gamepad) continue;

        for (let i = 0; i < gamepad.buttons.length; i++) {
          if (gamepad.buttons[i]?.pressed) {
            if (isJoystick) {
              if (i >= 0 && i <= 3) {
                setCurrentBind('FaceButtons');
                setIsRecording(false);
                onBindChange('FaceButtons');
                return;
              } else if (i >= 12 && i <= 15) {
                setCurrentBind('DPad');
                setIsRecording(false);
                onBindChange('DPad');
                return;
              }
            } else {
              setCurrentBind(String(i));
              setIsRecording(false);
              onBindChange(String(i));
              return;
            }
          }
        }

        if (isJoystick && gamepad.axes.length >= 4) {
          const leftX = gamepad.axes[0] ?? 0;
          const leftY = gamepad.axes[1] ?? 0;
          const rightX = gamepad.axes[2] ?? 0;
          const rightY = gamepad.axes[3] ?? 0;

          if (Math.abs(leftX) > 0.7 || Math.abs(leftY) > 0.7) {
            setCurrentBind('LeftStick');
            setIsRecording(false);
            onBindChange('LeftStick');
            return;
          }

          if (Math.abs(rightX) > 0.7 || Math.abs(rightY) > 0.7) {
            setCurrentBind('RightStick');
            setIsRecording(false);
            onBindChange('RightStick');
            return;
          }
        }
      }

      animationRef.current = requestAnimationFrame(checkGamepadInput);
    }

    animationRef.current = requestAnimationFrame(checkGamepadInput);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, gamepadConnected, onBindChange, isJoystick]);

  useEffect(() => {
    if (!isRecording) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsRecording(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRecording]);

  const startRecording = () => {
    if (gamepadConnected) {
      setIsRecording(true);
    }
  };

  const resetToDefault = () => {
    setCurrentBind(defaultBind);
    onBindChange(defaultBind);
  };

  return (
    <div className='space-y-2'>
      <span>{label}</span>
      <div className='flex items-center gap-2'>
        <Button
          ref={buttonRef as React.RefObject<HTMLButtonElement>}
          variant={isRecording ? 'destructive' : 'outline'}
          className={cx(
            'flex w-40 items-center justify-between gap-2',
            isRecording && 'animate-pulse',
          )}
          onClick={startRecording}
        >
          <Gamepad2Icon className='h-4 w-4' />
          <span className='truncate'>
            {isRecording
              ? 'Press a key...'
              : (mappings[currentBind] ?? currentBind)}
          </span>
        </Button>
        <Button
          variant='ghost'
          size='icon'
          onClick={resetToDefault}
          title='Reset to default'
        >
          <RotateCcwIcon className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}

export { GamepadBindInput };

import { Gamepad2Icon, RotateCcwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

import { cx } from '@/lib/utils';

type GamepadBindInputProps = {
  label: string;
  bind: string;
  defaultBind: string;
  onBindChange: (newBind: string) => void;
  className?: string;
};

const BUTTON_NAMES: Record<number, string> = {
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
};

function GamepadBindInput({
  label,
  bind,
  defaultBind,
  onBindChange,
  className,
}: GamepadBindInputProps) {
  const [currentBind, setCurrentBind] = useState(bind);
  const [isRecording, setIsRecording] = useState(false);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!navigator.getGamepads) {
      return;
    }

    const checkGamepads = () => {
      const gamepads = navigator.getGamepads();
      const hasConnectedGamepad = Array.from(gamepads).some(
        (gamepad) => gamepad !== null,
      );
      setGamepadConnected(hasConnectedGamepad);
    };

    checkGamepads();

    window.addEventListener('gamepadconnected', () => {
      setGamepadConnected(true);
    });

    window.addEventListener('gamepaddisconnected', checkGamepads);

    return () => {
      window.removeEventListener('gamepadconnected', () => {
        setGamepadConnected(true);
      });
      window.removeEventListener('gamepaddisconnected', checkGamepads);
    };
  }, []);

  useEffect(() => {
    if (!isRecording || !gamepadConnected) return;

    const checkGamepadInput = () => {
      const gamepads = navigator.getGamepads();

      for (const gamepad of gamepads) {
        if (!gamepad) continue;

        for (let i = 0; i < gamepad.buttons.length; i++) {
          if (gamepad.buttons[i]?.pressed) {
            const buttonName = BUTTON_NAMES[i] ?? `Button ${i}`;
            setCurrentBind(buttonName);
            setIsRecording(false);
            onBindChange(buttonName);
            return;
          }
        }

        // TODO: this needs to be changed to be a seperate binding for joysticks/dpad/userbuttons
        for (let i = 0; i < gamepad.axes.length; i++) {
          const axisValue = gamepad.axes[i];
          if (Math.abs(axisValue!) > 0.7) {
            const direction = axisValue! > 0 ? '+' : '-';
            const axisName = `Axis ${i}${direction}`;
            setCurrentBind(axisName);
            setIsRecording(false);
            onBindChange(axisName);
            return;
          }
        }
      }

      animationRef.current = requestAnimationFrame(checkGamepadInput);
    };

    animationRef.current = requestAnimationFrame(checkGamepadInput);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, gamepadConnected, onBindChange]);

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
    <div className={cx('flex items-center justify-between', className)}>
      <div className='font-medium'>{label}</div>
      <div className='flex items-center gap-2'>
        <Button
          ref={buttonRef}
          variant={isRecording ? 'destructive' : 'outline'}
          className={cx(
            'flex min-w-[100px] items-center gap-2',
            isRecording && 'animate-pulse',
          )}
          onClick={startRecording}
          disabled={!gamepadConnected}
        >
          <Gamepad2Icon className='h-4 w-4' />
          {isRecording ? 'Press a button...' : currentBind}
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

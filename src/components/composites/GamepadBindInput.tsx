import { Gamepad2Icon, RotateCcwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

import { cx } from '@/lib/utils';

import { ControlSource } from '@/stores/config';

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
  leftStick: 'Left Stick',
  rightStick: 'Right Stick',
  dPad: 'D-Pad',
  faceButtons: 'Face Buttons',
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
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [initialGamepadState, setInitialGamepadState] = useState<{
    buttons: boolean[];
    axes: number[];
  } | null>(null);
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
    if (!isRecording || !gamepadConnected) {
      // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
      setIsRecordingActive(false);
      // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
      setInitialGamepadState(null);
      return;
    }

    const gamepads = navigator.getGamepads();
    for (const gamepad of gamepads) {
      if (gamepad) {
        // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
        setInitialGamepadState({
          buttons: gamepad.buttons.map((btn) => btn?.pressed ?? false),
          axes: [...gamepad.axes],
        });
        break;
      }
    }

    const timeoutId = setTimeout(() => {
      setIsRecordingActive(true);
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      setIsRecordingActive(false);
      setInitialGamepadState(null);
    };
  }, [isRecording, gamepadConnected]);

  useEffect(() => {
    if (!isRecordingActive || !gamepadConnected || !initialGamepadState) return;

    function checkGamepadInput() {
      const gamepads = navigator.getGamepads();

      for (const gamepad of gamepads) {
        if (!gamepad) continue;

        for (let i = 0; i < gamepad.buttons.length; i++) {
          const isPressed = gamepad.buttons[i]?.pressed ?? false;
          const wasInitiallyPressed = initialGamepadState?.buttons[i] ?? false;

          if (isPressed && !wasInitiallyPressed) {
            if (isJoystick) {
              if (i >= 0 && i <= 3) {
                setCurrentBind(ControlSource.faceButtons);
                setIsRecording(false);
                setIsRecordingActive(false);
                onBindChange(ControlSource.faceButtons);
                return;
              } else if (i >= 12 && i <= 15) {
                setCurrentBind(ControlSource.dPad);
                setIsRecording(false);
                setIsRecordingActive(false);
                onBindChange(ControlSource.dPad);
                return;
              }
            } else {
              setCurrentBind(String(i));
              setIsRecording(false);
              setIsRecordingActive(false);
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

          const initialLeftX = initialGamepadState?.axes[0] ?? 0;
          const initialLeftY = initialGamepadState?.axes[1] ?? 0;
          const initialRightX = initialGamepadState?.axes[2] ?? 0;
          const initialRightY = initialGamepadState?.axes[3] ?? 0;

          if (
            (Math.abs(leftX) > 0.7 || Math.abs(leftY) > 0.7) &&
            !(Math.abs(initialLeftX) > 0.7 || Math.abs(initialLeftY) > 0.7)
          ) {
            setCurrentBind(ControlSource.leftStick);
            setIsRecording(false);
            setIsRecordingActive(false);
            onBindChange(ControlSource.leftStick);
            return;
          }

          if (
            (Math.abs(rightX) > 0.7 || Math.abs(rightY) > 0.7) &&
            !(Math.abs(initialRightX) > 0.7 || Math.abs(initialRightY) > 0.7)
          ) {
            setCurrentBind(ControlSource.rightStick);
            setIsRecording(false);
            setIsRecordingActive(false);
            onBindChange(ControlSource.rightStick);
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
  }, [
    isRecordingActive,
    gamepadConnected,
    initialGamepadState,
    onBindChange,
    isJoystick,
  ]);

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

  function startRecording() {
    if (gamepadConnected) {
      setIsRecording(true);
    }
  }

  function resetToDefault() {
    setCurrentBind(defaultBind);
    onBindChange(defaultBind);
  }

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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              aria-label='Reset to default binding'
              onClick={resetToDefault}
            >
              <RotateCcwIcon className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reset to default binding</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export { GamepadBindInput };

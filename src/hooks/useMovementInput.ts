import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

import { type ControlSource, configStore } from '@/stores/configStore';
import {
  type MovementInputArray,
  movementInputStore,
} from '@/stores/movementInputStore';

const EMPTY_INPUT: MovementInputArray = [0, 0, 0, 0, 0, 0];

function clamp(value: number) {
  return Math.max(-1, Math.min(1, value));
}

function useMovementInput() {
  const config = useStore(configStore);
  const pressedKeys = useRef(new Set<string>());
  const animationFrameRef = useRef<number | undefined>(undefined);

  const getKeyboardInput = useCallback((): MovementInputArray => {
    if (!config) return [...EMPTY_INPUT];

    const input: MovementInputArray = [...EMPTY_INPUT];
    const keys = pressedKeys.current;

    input[0] =
      (keys.has(config.keyboard.moveForward) ? 1 : 0) +
      (keys.has(config.keyboard.moveBackward) ? -1 : 0);
    input[1] =
      (keys.has(config.keyboard.moveRight) ? 1 : 0) +
      (keys.has(config.keyboard.moveLeft) ? -1 : 0);
    input[2] =
      (keys.has(config.keyboard.moveUp) ? 1 : 0) +
      (keys.has(config.keyboard.moveDown) ? -1 : 0);
    input[3] =
      (keys.has(config.keyboard.pitchUp) ? 1 : 0) +
      (keys.has(config.keyboard.pitchDown) ? -1 : 0);
    input[4] =
      (keys.has(config.keyboard.yawRight) ? 1 : 0) +
      (keys.has(config.keyboard.yawLeft) ? -1 : 0);
    input[5] =
      (keys.has(config.keyboard.rollRight) ? 1 : 0) +
      (keys.has(config.keyboard.rollLeft) ? -1 : 0);

    return input;
  }, [config]);

  const processGamepadInput = useCallback((): MovementInputArray => {
    if (!config) return [...EMPTY_INPUT];
    const gamepad = navigator.getGamepads()[0];
    if (!gamepad) return [...EMPTY_INPUT];

    const input: MovementInputArray = [...EMPTY_INPUT];

    const handleMoveHorizontal = (source: ControlSource) => {
      switch (source) {
        case 'leftStick':
          input[0] = -(gamepad.axes[1] ?? 0);
          input[1] = gamepad.axes[0] ?? 0;
          break;
        case 'rightStick':
          input[0] = -(gamepad.axes[3] ?? 0);
          input[1] = gamepad.axes[2] ?? 0;
          break;
        case 'dPad':
          input[0] =
            (gamepad.buttons[12]?.value ?? 0) +
            -(gamepad.buttons[13]?.value ?? 0);
          input[1] =
            (gamepad.buttons[14]?.value ?? 0) +
            -(gamepad.buttons[15]?.value ?? 0);
          break;
        case 'faceButtons':
          input[0] =
            (gamepad.buttons[0]?.value ?? 0) +
            -(gamepad.buttons[2]?.value ?? 0);
          input[1] =
            (gamepad.buttons[1]?.value ?? 0) +
            -(gamepad.buttons[3]?.value ?? 0);
          break;
      }
    };

    const handlePitchYaw = (source: ControlSource) => {
      switch (source) {
        case 'leftStick':
          input[3] = -(gamepad.axes[1] ?? 0);
          input[4] = gamepad.axes[0] ?? 0;
          break;
        case 'rightStick':
          input[3] = -(gamepad.axes[3] ?? 0);
          input[4] = gamepad.axes[2] ?? 0;
          break;
        case 'dPad':
          input[3] =
            (gamepad.buttons[12]?.value ?? 0) +
            -(gamepad.buttons[13]?.value ?? 0);
          input[4] =
            (gamepad.buttons[14]?.value ?? 0) +
            -(gamepad.buttons[15]?.value ?? 0);
          break;
        case 'faceButtons':
          input[3] =
            (gamepad.buttons[0]?.value ?? 0) +
            -(gamepad.buttons[2]?.value ?? 0);
          input[4] =
            (gamepad.buttons[1]?.value ?? 0) +
            -(gamepad.buttons[3]?.value ?? 0);
          break;
      }
    };

    handleMoveHorizontal(config.gamepad.moveHorizontal);
    handlePitchYaw(config.gamepad.pitchYaw);

    const upButton = parseInt(config.gamepad.moveUp);
    const downButton = parseInt(config.gamepad.moveDown);
    input[2] =
      (gamepad.buttons[upButton]?.value ?? 0) +
      -(gamepad.buttons[downButton]?.value ?? 0);

    const rollRightButton = parseInt(config.gamepad.rollRight);
    const rollLeftButton = parseInt(config.gamepad.rollLeft);
    input[5] =
      (gamepad.buttons[rollRightButton]?.value ?? 0) +
      -(gamepad.buttons[rollLeftButton]?.value ?? 0);

    return input.map(clamp) as MovementInputArray;
  }, [config]);

  function mergeInputs(
    keyboard: MovementInputArray,
    gamepad: MovementInputArray,
  ) {
    return keyboard.map((k, i) =>
      clamp(k + (gamepad[i] ?? 0)),
    ) as MovementInputArray;
  }

  async function sendInput(input: MovementInputArray) {
    movementInputStore.setState(() => input);
    try {
      await invoke('send_movement_input', { payload: input });
    } catch (error) {
      logError('Failed to send movement input:', error);
      toast.error('Failed to send movement input');
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      pressedKeys.current.add(event.code);
    }

    function handleKeyUp(event: KeyboardEvent) {
      pressedKeys.current.delete(event.code);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        pressedKeys.current.clear();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    function sendLoop() {
      const keyboardInput = getKeyboardInput();
      const gamepadInput = processGamepadInput();
      const mergedInput = mergeInputs(keyboardInput, gamepadInput);

      void sendInput(mergedInput);
      animationFrameRef.current = requestAnimationFrame(sendLoop);
    }

    sendLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      void sendInput(EMPTY_INPUT);
      movementInputStore.setState(() => EMPTY_INPUT);
    };
  }, [config, getKeyboardInput, processGamepadInput]);
}

export { useMovementInput };

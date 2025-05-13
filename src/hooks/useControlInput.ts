import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef } from 'react';

import { type ControlSource, configStore } from '@/stores/configStore';

type InputArray = [number, number, number, number, number, number];
const EMPTY_INPUT: InputArray = [0, 0, 0, 0, 0, 0];

function clamp(value: number) {
  return Math.max(-1, Math.min(1, value));
}

function useControlInput() {
  const config = useStore(configStore, (state) => state);
  const pressedKeys = useRef(new Set<string>());
  const animationFrameRef = useRef<number | undefined>(undefined);

  const getKeyboardInput = useCallback((): InputArray => {
    if (!config) return [...EMPTY_INPUT];

    const input: InputArray = [...EMPTY_INPUT];
    const keys = pressedKeys.current;

    if (keys.has(config.keyboard.moveForward)) input[0] = 1;
    if (keys.has(config.keyboard.moveBackward)) input[0] = -1;
    if (keys.has(config.keyboard.moveRight)) input[1] = 1;
    if (keys.has(config.keyboard.moveLeft)) input[1] = -1;
    if (keys.has(config.keyboard.moveUp)) input[2] = 1;
    if (keys.has(config.keyboard.moveDown)) input[2] = -1;
    if (keys.has(config.keyboard.pitchUp)) input[3] = 1;
    if (keys.has(config.keyboard.pitchDown)) input[3] = -1;
    if (keys.has(config.keyboard.yawRight)) input[4] = 1;
    if (keys.has(config.keyboard.yawLeft)) input[4] = -1;
    if (keys.has(config.keyboard.rollRight)) input[5] = 1;
    if (keys.has(config.keyboard.rollLeft)) input[5] = -1;

    return input;
  }, [config]);

  const processGamepadInput = useCallback((): InputArray => {
    if (!config) return [...EMPTY_INPUT];
    const gamepad = navigator.getGamepads()[0];
    if (!gamepad) return [...EMPTY_INPUT];

    const input: InputArray = [...EMPTY_INPUT];

    const handleMoveHorizontal = (source: ControlSource) => {
      switch (source) {
        case 'LeftStick':
          input[0] = gamepad.axes[1] ?? 0;
          input[1] = gamepad.axes[0] ?? 0;
          break;
        case 'RightStick':
          input[0] = gamepad.axes[3] ?? 0;
          input[1] = gamepad.axes[2] ?? 0;
          break;
        case 'DPad':
          input[0] = gamepad.buttons[12]?.value ?? 0;
          input[0] -= gamepad.buttons[13]?.value ?? 0;
          input[1] = gamepad.buttons[14]?.value ?? 0;
          input[1] -= gamepad.buttons[15]?.value ?? 0;
          break;
        case 'FaceButtons':
          input[0] = gamepad.buttons[0]?.value ?? 0;
          input[0] -= gamepad.buttons[2]?.value ?? 0;
          input[1] = gamepad.buttons[1]?.value ?? 0;
          input[1] -= gamepad.buttons[3]?.value ?? 0;
          break;
      }
    };

    const handlePitchYaw = (source: ControlSource) => {
      switch (source) {
        case 'LeftStick':
          input[3] = -(gamepad.axes[1] ?? 0);
          input[4] = gamepad.axes[0] ?? 0;
          break;
        case 'RightStick':
          input[3] = -(gamepad.axes[3] ?? 0);
          input[4] = gamepad.axes[2] ?? 0;
          break;
        case 'DPad':
          input[3] = gamepad.buttons[12]?.value ?? 0;
          input[3] -= gamepad.buttons[13]?.value ?? 0;
          input[4] = gamepad.buttons[14]?.value ?? 0;
          input[4] -= gamepad.buttons[15]?.value ?? 0;
          break;
        case 'FaceButtons':
          input[3] = gamepad.buttons[0]?.value ?? 0;
          input[3] -= gamepad.buttons[2]?.value ?? 0;
          input[4] = gamepad.buttons[1]?.value ?? 0;
          input[4] -= gamepad.buttons[3]?.value ?? 0;
          break;
      }
    };

    handleMoveHorizontal(config.gamepad.moveHorizontal);
    handlePitchYaw(config.gamepad.pitchYaw);

    const upButton = parseInt(config.gamepad.moveUp);
    const downButton = parseInt(config.gamepad.moveDown);
    input[2] =
      (gamepad.buttons[upButton]?.value ?? 0) -
      (gamepad.buttons[downButton]?.value ?? 0);

    const rollRightButton = parseInt(config.gamepad.rollRight);
    const rollLeftButton = parseInt(config.gamepad.rollLeft);
    input[5] =
      (gamepad.buttons[rollRightButton]?.value ?? 0) -
      (gamepad.buttons[rollLeftButton]?.value ?? 0);

    return input.map(clamp) as InputArray;
  }, [config]);

  function mergeInputs(keyboard: InputArray, gamepad: InputArray) {
    return keyboard.map((k, i) => clamp(k + (gamepad[i] ?? 0))) as InputArray;
  }

  async function sendInput(input: InputArray) {
    try {
      await invoke('send_control_input', { input });
    } catch (error) {
      console.error('Failed to send control input:', error);
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
    };
  }, [config, getKeyboardInput, processGamepadInput]);
}

export { useControlInput };

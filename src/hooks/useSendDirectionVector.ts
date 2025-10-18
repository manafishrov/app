import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

import { type ControlSource, configStore } from '@/stores/config';
import {
  type DirectionVector,
  directionVectorStore,
} from '@/stores/directionVector';

const EMPTY_INPUT: DirectionVector = [0, 0, 0, 0, 0, 0, 0, 0];

function clamp(value: number) {
  return Math.max(-1, Math.min(1, value));
}

function useSendDirectionVector() {
  const config = useStore(configStore);
  const pressedKeys = useRef(new Set<string>());
  const animationFrameRef = useRef<number | undefined>(undefined);

  const getKeyboardInput = useCallback((): DirectionVector => {
    if (!config) return [...EMPTY_INPUT];

    const input: DirectionVector = [...EMPTY_INPUT];
    const keys = pressedKeys.current;

    input[0] =
      (keys.has(config.keyboard.surgeForward) ? 1 : 0) +
      (keys.has(config.keyboard.surgeBackward) ? -1 : 0);
    input[1] =
      (keys.has(config.keyboard.swayRight) ? 1 : 0) +
      (keys.has(config.keyboard.swayLeft) ? -1 : 0);
    input[2] =
      (keys.has(config.keyboard.heaveUp) ? 1 : 0) +
      (keys.has(config.keyboard.heaveDown) ? -1 : 0);
    input[3] =
      (keys.has(config.keyboard.pitchUp) ? 1 : 0) +
      (keys.has(config.keyboard.pitchDown) ? -1 : 0);
    input[4] =
      (keys.has(config.keyboard.yawRight) ? 1 : 0) +
      (keys.has(config.keyboard.yawLeft) ? -1 : 0);
    input[5] =
      (keys.has(config.keyboard.rollRight) ? 1 : 0) +
      (keys.has(config.keyboard.rollLeft) ? -1 : 0);
    input[6] =
      (keys.has(config.keyboard.action1Positive) ? 1 : 0) +
      (keys.has(config.keyboard.action1Negative) ? -1 : 0);
    input[7] =
      (keys.has(config.keyboard.action2Positive) ? 1 : 0) +
      (keys.has(config.keyboard.action2Negative) ? -1 : 0);

    return input;
  }, [config]);

  const getGamepadInput = useCallback((): DirectionVector => {
    if (!config) return [...EMPTY_INPUT];
    const gamepad = navigator.getGamepads()[0];
    if (!gamepad) return [...EMPTY_INPUT];

    const input: DirectionVector = [...EMPTY_INPUT];

    const handleSurgeSway = (source: ControlSource) => {
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

    handleSurgeSway(config.gamepad.surgeSway);
    handlePitchYaw(config.gamepad.pitchYaw);

    const heaveUpButton = parseInt(config.gamepad.heaveUp);
    const heaveDownButton = parseInt(config.gamepad.heaveDown);
    input[2] =
      (gamepad.buttons[heaveUpButton]?.value ?? 0) +
      -(gamepad.buttons[heaveDownButton]?.value ?? 0);

    const rollRightButton = parseInt(config.gamepad.rollRight);
    const rollLeftButton = parseInt(config.gamepad.rollLeft);
    input[5] =
      (gamepad.buttons[rollRightButton]?.value ?? 0) +
      -(gamepad.buttons[rollLeftButton]?.value ?? 0);

    const action1PositiveButton = parseInt(config.gamepad.action1Positive);
    const action1NegativeButton = parseInt(config.gamepad.action1Negative);
    input[6] =
      (gamepad.buttons[action1PositiveButton]?.value ?? 0) +
      -(gamepad.buttons[action1NegativeButton]?.value ?? 0);

    const action2PositiveButton = parseInt(config.gamepad.action2Positive);
    const action2NegativeButton = parseInt(config.gamepad.action2Negative);
    input[7] =
      (gamepad.buttons[action2PositiveButton]?.value ?? 0) +
      -(gamepad.buttons[action2NegativeButton]?.value ?? 0);

    return input.map(clamp) as DirectionVector;
  }, [config]);

  function mergeInput(keyboard: DirectionVector, gamepad: DirectionVector) {
    return keyboard.map((k, i) =>
      clamp(k + (gamepad[i] ?? 0)),
    ) as DirectionVector;
  }

  const lastDirectionVectorErrorRef = useRef(0);

  async function sendDirectionVector(command: DirectionVector) {
    directionVectorStore.setState(() => command);
    try {
      await invoke('send_direction_vector', { payload: command });
    } catch (error) {
      const now = Date.now();
      if (now - lastDirectionVectorErrorRef.current > 10000) {
        lastDirectionVectorErrorRef.current = now;
        logError('Failed to send direction vector:', error);
        toast.error('Failed to send direction vector');
      }
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
      const gamepadInput = getGamepadInput();
      const mergedInput = mergeInput(keyboardInput, gamepadInput);

      void sendDirectionVector(mergedInput);
      animationFrameRef.current = requestAnimationFrame(sendLoop);
    }

    sendLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      void sendDirectionVector(EMPTY_INPUT);
      directionVectorStore.setState(() => EMPTY_INPUT);
    };
  }, [config, getKeyboardInput, getGamepadInput]);
}

export { useSendDirectionVector };

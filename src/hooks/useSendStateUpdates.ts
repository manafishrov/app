import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useRef } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

import { configStore } from '@/stores/config';

function useSendStateUpdates() {
  const config = useStore(configStore);
  const pressedKeys = useRef(new Set<string>());
  const lastStateUpdateRef = useRef({
    record: false,
    stabilizeDepth: false,
    stabilizePitch: false,
    stabilizeRoll: false,
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      pressedKeys.current.add(event.code);
    }
    function handleKeyUp(event: KeyboardEvent) {
      pressedKeys.current.delete(event.code);
    }
    function handleVisibilityChange() {
      if (document.hidden) pressedKeys.current.clear();
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
    let animationFrame: number;
    const states = [
      'record',
      'stabilizeDepth',
      'stabilizePitch',
      'stabilizeRoll',
    ] as const;

    async function handleStateUpdates(
      isPressed: boolean,
      stateUpdate: (typeof states)[number],
    ) {
      const last = lastStateUpdateRef.current;
      if (stateUpdate === 'record' && isPressed && !last.record) {
        toast('Coming soon: Recording feature is not yet implemented');
        last.record = true;
      } else if (stateUpdate === 'record' && !isPressed) {
        last.record = false;
      }
      if (
        stateUpdate === 'stabilizeDepth' &&
        isPressed &&
        !last.stabilizeDepth
      ) {
        try {
          await invoke('toggle_depth_stabilization');
        } catch (error) {
          logError('Failed to toggle depth stabilization:', error);
          toast.error('Failed to toggle depth stabilization');
        }
        last.stabilizeDepth = true;
      } else if (stateUpdate === 'stabilizeDepth' && !isPressed) {
        last.stabilizeDepth = false;
      }
      if (
        stateUpdate === 'stabilizePitch' &&
        isPressed &&
        !last.stabilizePitch
      ) {
        try {
          await invoke('toggle_pitch_stabilization');
        } catch (error) {
          logError('Failed to toggle pitch stabilization:', error);
          toast.error('Failed to toggle pitch stabilization');
        }
        last.stabilizePitch = true;
      } else if (stateUpdate === 'stabilizePitch' && !isPressed) {
        last.stabilizePitch = false;
      }
      if (stateUpdate === 'stabilizeRoll' && isPressed && !last.stabilizeRoll) {
        try {
          await invoke('toggle_roll_stabilization');
        } catch (error) {
          logError('Failed to toggle roll stabilization:', error);
          toast.error('Failed to toggle roll stabilization');
        }
        last.stabilizeRoll = true;
      } else if (stateUpdate === 'stabilizeRoll' && !isPressed) {
        last.stabilizeRoll = false;
      }
    }

    function poll() {
      if (config) {
        states.forEach((stateUpdate) => {
          const key = config.keyboard[stateUpdate];
          void handleStateUpdates(pressedKeys.current.has(key), stateUpdate);
        });
        const gamepad = navigator.getGamepads?.()[0];
        if (gamepad) {
          states.forEach((stateUpdate) => {
            const btnStr = config.gamepad[stateUpdate];
            const btnIdx = parseInt(btnStr, 10);
            const isPressed = Boolean(gamepad.buttons[btnIdx]?.pressed);
            void handleStateUpdates(isPressed, stateUpdate);
          });
        }
      }
      animationFrame = requestAnimationFrame(poll);
    }
    poll();
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [config]);
}

export { useSendStateUpdates };

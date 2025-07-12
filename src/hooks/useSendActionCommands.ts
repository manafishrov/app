import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useRef } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError, logInfo } from '@/lib/log';

import { configStore } from '@/stores/config';

function useSendActionCommands() {
  const config = useStore(configStore);
  const pressedKeys = useRef(new Set<string>());
  const lastActionStateRef = useRef({
    record: false,
    action1: false,
    action2: false,
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
    let raf: number;
    const actions = [
      'record',
      'action1',
      'action2',
      'stabilizeDepth',
      'stabilizePitch',
      'stabilizeRoll',
    ] as const;

    async function handleActions(
      isPressed: boolean,
      action: (typeof actions)[number],
    ) {
      const last = lastActionStateRef.current;
      if (action === 'record' && isPressed && !last.record) {
        logInfo('toggle-recording');
        last.record = true;
      } else if (action === 'record' && !isPressed) {
        last.record = false;
      }
      if (action === 'stabilizeDepth' && isPressed && !last.stabilizeDepth) {
        try {
          await invoke('toggle_depth_stabilization');
        } catch (error) {
          logError('Failed to toggle depth stabilization:', error);
          toast.error('Failed to toggle depth stabilization');
        }
        last.stabilizeDepth = true;
      } else if (action === 'stabilizeDepth' && !isPressed) {
        last.stabilizeDepth = false;
      }
      if (action === 'stabilizePitch' && isPressed && !last.stabilizePitch) {
        try {
          await invoke('toggle_pitch_stabilization');
        } catch (error) {
          logError('Failed to toggle pitch stabilization:', error);
          toast.error('Failed to toggle pitch stabilization');
        }
        last.stabilizePitch = true;
      } else if (action === 'stabilizePitch' && !isPressed) {
        last.stabilizePitch = false;
      }
      if (action === 'stabilizeRoll' && isPressed && !last.stabilizeRoll) {
        try {
          await invoke('toggle_roll_stabilization');
        } catch (error) {
          logError('Failed to toggle roll stabilization:', error);
          toast.error('Failed to toggle roll stabilization');
        }
        last.stabilizeRoll = true;
      } else if (action === 'stabilizeRoll' && !isPressed) {
        last.stabilizeRoll = false;
      }
      if (action === 'action1' && isPressed && !last.action1) {
        try {
          await invoke('send_action1_command');
        } catch (error) {
          logError('Failed to send action1 command:', error);
          toast.error('Failed to send action1 command');
        }
        last.action1 = true;
      } else if (action === 'action1' && !isPressed) {
        last.action1 = false;
      }
      if (action === 'action2' && isPressed && !last.action2) {
        try {
          await invoke('send_action2_command');
        } catch (error) {
          logError('Failed to send action2 command:', error);
          toast.error('Failed to send action2 command');
        }
        last.action2 = true;
      } else if (action === 'action2' && !isPressed) {
        last.action2 = false;
      }
    }

    function poll() {
      if (config) {
        actions.forEach((action) => {
          const key = config.keyboard[action];
          void handleActions(pressedKeys.current.has(key), action);
        });
        const gamepad = navigator.getGamepads?.()[0];
        if (gamepad) {
          actions.forEach((action) => {
            const btnStr = config.gamepad[action];
            const btnIdx = parseInt(btnStr, 10);
            const isPressed = Boolean(gamepad.buttons[btnIdx]?.pressed);
            void handleActions(isPressed, action);
          });
        }
      }
      raf = requestAnimationFrame(poll);
    }
    poll();
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [config]);
}

export { useSendActionCommands };

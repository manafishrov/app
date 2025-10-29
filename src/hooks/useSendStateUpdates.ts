import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useRef } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

import { configStore } from '@/stores/config';
import { recordingStore, setRecordingState } from '@/stores/recording';

function useSendStateUpdates() {
  const config = useStore(configStore);
  const { isRecording, webrtcConnected } = useStore(
    recordingStore,
    (state) => ({
      isRecording: state.isRecording,
      webrtcConnected: state.webrtcConnected,
    }),
  );
  const pressedKeys = useRef(new Set<string>());
  const lastStateUpdateRef = useRef({
    pitchStabilization: false,
    rollStabilization: false,
    depthHold: false,
    record: false,
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
      'pitchStabilization',
      'rollStabilization',
      'depthHold',
      'record',
    ] as const;

    async function handleStateUpdates(
      isPressed: boolean,
      stateUpdate: (typeof states)[number],
    ) {
      const last = lastStateUpdateRef.current;
      if (
        stateUpdate === 'record' &&
        isPressed &&
        !last.record &&
        webrtcConnected
      ) {
        setRecordingState({
          isRecording: !isRecording,
          startTime: isRecording ? null : Date.now(),
        });
        last.record = true;
      } else if (stateUpdate === 'record' && !isPressed) {
        last.record = false;
      }
      if (stateUpdate === 'depthHold' && isPressed && !last.depthHold) {
        try {
          await invoke('toggle_depth_hold');
        } catch (error) {
          logError('Failed to toggle depth hold:', error);
          toast.error('Failed to toggle depth hold');
        }
        last.depthHold = true;
      } else if (stateUpdate === 'depthHold' && !isPressed) {
        last.depthHold = false;
      }
      if (
        stateUpdate === 'pitchStabilization' &&
        isPressed &&
        !last.pitchStabilization
      ) {
        try {
          await invoke('toggle_pitch_stabilization');
        } catch (error) {
          logError('Failed to toggle pitch stabilization:', error);
          toast.error('Failed to toggle pitch stabilization');
        }
        last.pitchStabilization = true;
      } else if (stateUpdate === 'pitchStabilization' && !isPressed) {
        last.pitchStabilization = false;
      }
      if (
        stateUpdate === 'rollStabilization' &&
        isPressed &&
        !last.rollStabilization
      ) {
        try {
          await invoke('toggle_roll_stabilization');
        } catch (error) {
          logError('Failed to toggle roll stabilization:', error);
          toast.error('Failed to toggle roll stabilization');
        }
        last.rollStabilization = true;
      } else if (stateUpdate === 'rollStabilization' && !isPressed) {
        last.rollStabilization = false;
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
  }, [config, isRecording, webrtcConnected]);
}

export { useSendStateUpdates };

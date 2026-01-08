import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

type GamepadData = {
  id: string;
  index: number;
  connected: boolean;
  mapping: string;
  axes: ReadonlyArray<number>;
  buttons: ReadonlyArray<{ pressed: boolean; value: number }>;
  timestamp: number;
  vibrationActuator: { type: string } | null;
};

const gamepads: (Gamepad | null)[] = [null, null, null, null];

function getGamepads() {
  return [...gamepads];
}

function createGamepadFromEvent(event: GamepadData): Gamepad {
  const { id, index, axes, connected, mapping, timestamp, vibrationActuator } =
    event;
  const buttons = event.buttons.map(
    (btn) =>
      ({
        value: btn.value,
        touched: btn.value > 0,
        pressed: btn.pressed,
      }) as GamepadButton,
  );

  let vibrationActuatorObj = null;
  if (vibrationActuator) {
    vibrationActuatorObj = {
      type: vibrationActuator.type,
      playEffect: async (type: string, params: any) => {
        if (type === 'dual-rumble') {
          await invoke('gamepad_vibrate', {
            index,
            low_freq: params.weakMagnitude || 0,
            high_freq: params.strongMagnitude || 0,
            duration_ms: params.duration || 0,
          });
        }
      },
    };
  }

  return {
    index,
    id,
    connected,
    axes,
    buttons,
    timestamp,
    mapping,
    hapticActuators: [],
    vibrationActuator: vibrationActuatorObj,
  } as unknown as Gamepad;
}

function handleGamepadEvent({ payload }: { payload: GamepadData }) {
  const gamepad = createGamepadFromEvent(payload);
  const prevConnected = gamepads[gamepad.index]?.connected ?? false;

  if (payload.connected && !prevConnected) {
    // Connected
    gamepads[gamepad.index] = gamepad;
    const customEvent = new GamepadEvent('gamepadconnected', { gamepad });
    window.dispatchEvent(customEvent);
  } else if (!payload.connected && prevConnected) {
    // Disconnected
    gamepads[gamepad.index] = null;
    const customEvent = new GamepadEvent('gamepaddisconnected', { gamepad });
    window.dispatchEvent(customEvent);
  } else {
    // Update
    gamepads[gamepad.index] = gamepad;
  }
}

function useGamepadListener() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    navigator.getGamepads = getGamepads;

    void (async () => {
      await invoke('start_gamepad_stream').catch((error) => {
        logError('Failed to start gamepad stream:', error);
        toast.error('Failed to start gamepad stream');
      });
      try {
        unlisten = await listen<GamepadData>(
          'gamepad_event',
          handleGamepadEvent,
        );
      } catch (error) {
        logError('Failed to listen for gamepad events:', error);
        toast.error('Failed to listen for gamepad events');
      }
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}

export { useGamepadListener };

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

type GamepadEventType =
  | 'connected'
  | 'disconnected'
  | 'buttonPressed'
  | 'buttonReleased'
  | 'buttonChanged'
  | 'axisChanged'
  | 'dropped';

type GamepadData = {
  id: number;
  uuid: string;
  connected: boolean;
  vibration: boolean;
  event: GamepadEventType;
  timestamp: number;
  name: string;
  buttons: ReadonlyArray<number>;
  axes: ReadonlyArray<number>;
  mapping: string;
  powerInfo: string;
};

const gamepads: (Gamepad | null)[] = [null, null, null, null];

function getGamepads() {
  return [...gamepads];
}

function createGamepadFromEvent(event: GamepadData): Gamepad {
  const { id, axes, connected, name, timestamp, uuid, mapping } = event;
  const buttons = event.buttons.map(
    (value) => ({ value, touched: false, pressed: value > 0 }) as GamepadButton,
  );

  return {
    index: id,
    id: `${name} (${uuid})`,
    connected,
    axes,
    buttons,
    timestamp,
    mapping,
    hapticActuators: [],
    vibrationActuator: null,
  } as unknown as Gamepad;
}

function handleGamepadEvent({ payload }: { payload: GamepadData }) {
  const gamepad = createGamepadFromEvent(payload);

  if (payload.event === 'connected') {
    gamepads[gamepad.index] = gamepad;
    const customEvent = new GamepadEvent('gamepadconnected', { gamepad });
    window.dispatchEvent(customEvent);
  } else if (payload.event === 'disconnected') {
    gamepads[gamepad.index] = null;
    const customEvent = new GamepadEvent('gamepaddisconnected', { gamepad });
    window.dispatchEvent(customEvent);
  } else {
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

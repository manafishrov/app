import { toast } from '@manafishrov/ui/toaster';
import { listen } from '@tauri-apps/api/event';

import { logError } from '@/lib/log';
import { invokeCommand, type CleanupFn } from '@/tauri/core';

const EVENT = 'gamepad_event';

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

const getGamepads = () => {
  return [...gamepads];
};

const createGamepadFromEvent = (event: GamepadData): Gamepad => {
  const { id, index, axes, connected, mapping, timestamp, vibrationActuator } = event;
  const buttons = event.buttons.map(
    (btn) =>
      ({
        value: btn.value,
        touched: btn.value > 0,
        pressed: btn.pressed,
      }) as GamepadButton,
  );

  const vibrationActuatorObj = vibrationActuator
    ? {
        type: vibrationActuator.type as GamepadHapticEffectType,
        playEffect: async (type: GamepadHapticEffectType, params?: GamepadEffectParameters) => {
          if (type === 'dual-rumble' && params) {
            await invokeCommand('gamepad_vibrate', {
              index,
              low_freq: params['weakMagnitude'] ?? 0,
              high_freq: params['strongMagnitude'] ?? 0,
              duration_ms: params['duration'] ?? 0,
            });
          }
          return 'complete';
        },
      }
    : null;

  return {
    index,
    id,
    connected,
    axes: axes as readonly number[],
    buttons: buttons as readonly GamepadButton[],
    timestamp,
    mapping,
    hapticActuators: [] as readonly GamepadHapticActuator[],
    vibrationActuator: vibrationActuatorObj as GamepadHapticActuator | null,
  } as Gamepad;
};

const handleGamepadEvent = ({ payload }: { payload: GamepadData }) => {
  const gamepad = createGamepadFromEvent(payload);
  const prevConnected = gamepads[gamepad.index]?.connected ?? false;

  if (payload.connected && !prevConnected) {
    gamepads[gamepad.index] = gamepad;
    const customEvent = new GamepadEvent('gamepadconnected', { gamepad });
    window.dispatchEvent(customEvent);
  } else if (!payload.connected && prevConnected) {
    gamepads[gamepad.index] = null;
    const customEvent = new GamepadEvent('gamepaddisconnected', { gamepad });
    window.dispatchEvent(customEvent);
  } else {
    gamepads[gamepad.index] = gamepad;
  }
};

export const setupGamepadListener = async (): Promise<CleanupFn> => {
  navigator.getGamepads = getGamepads;

  await invokeCommand('start_gamepad_stream');

  const unlisten = await listen<GamepadData>(EVENT, handleGamepadEvent).catch((error) => {
    logError('Failed to listen for gamepad events:', error);
    toast.create({
      title: 'Failed to listen for gamepad events',
      type: 'error',
    });
    return () => {};
  });

  return unlisten;
};

export const vibrateGamepad = async (
  index: number,
  weakMagnitude: number,
  strongMagnitude: number,
  duration: number,
) => {
  await invokeCommand('gamepad_vibrate', {
    index,
    low_freq: weakMagnitude,
    high_freq: strongMagnitude,
    duration_ms: duration,
  });
};

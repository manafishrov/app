import { toast } from '@manafishrov/ui/toaster';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { invokeCommand, type CleanupFn } from '@/tauri/core';

const EVENT = 'gamepad_event';

type GamepadData = {
  id: string;
  index: number;
  connected: boolean;
  mapping: string;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
  timestamp: number;
  vibrationActuator: { type: string } | null;
};

const gamepads = new Map<number, Gamepad>();

const noopCleanup: CleanupFn = () => 0;

const resolveVoid: () => void = () => 0;

const getGamepads = (): ReturnType<Navigator['getGamepads']> => [...gamepads.values()];

const toMappingType = (mapping: string): GamepadMappingType =>
  mapping === 'standard' ? 'standard' : '';

const createVibrationActuator = (
  index: number,
  vibrationActuator: GamepadData['vibrationActuator'],
): GamepadHapticActuator => {
  const supportsVibration = Boolean(vibrationActuator);

  return {
    playEffect: (
      type: GamepadHapticEffectType,
      params?: GamepadEffectParameters,
    ): Promise<GamepadHapticsResult> => {
      if (!supportsVibration || type !== 'dual-rumble' || !params) {
        return Promise.resolve('complete');
      }

      return invokeCommand('gamepad_vibrate', {
        index,
        lowFreq: params.weakMagnitude ?? 0,
        highFreq: params.strongMagnitude ?? 0,
        durationMs: params.duration ?? 0,
      }).then((): GamepadHapticsResult => 'complete');
    },
    pulse: (value: number, duration: number): Promise<boolean> =>
      invokeCommand('gamepad_vibrate', {
        index,
        lowFreq: value,
        highFreq: value,
        durationMs: duration,
      })
        .then((): boolean => true)
        .catch((): boolean => false),
    reset: (): Promise<GamepadHapticsResult> => Promise.resolve('complete'),
  };
};

const createGamepadFromEvent = (event: GamepadData): Gamepad => {
  const { id, index, axes, connected, mapping, timestamp, vibrationActuator } = event;
  const buttons: GamepadButton[] = event.buttons.map(
    (btn): GamepadButton => ({
      value: btn.value,
      touched: btn.value > 0,
      pressed: btn.pressed,
    }),
  );
  const vibrationActuatorObj = createVibrationActuator(index, vibrationActuator);
  const hapticActuators = vibrationActuator ? [vibrationActuatorObj] : [];

  const gamepad: Gamepad = {
    index,
    id,
    connected,
    axes,
    buttons,
    timestamp,
    mapping: toMappingType(mapping),
    hapticActuators,
    vibrationActuator: vibrationActuatorObj,
  };

  return gamepad;
};

const dispatchConnectionEvent = (
  eventName: 'gamepadconnected' | 'gamepaddisconnected',
  gamepad: Gamepad,
): void => {
  const customEvent = new GamepadEvent(eventName, { gamepad });
  globalThis.dispatchEvent(customEvent);
};

const handleGamepadEvent = ({ payload }: { payload: GamepadData }): void => {
  const gamepad = createGamepadFromEvent(payload);
  const previousGamepad = gamepads.get(gamepad.index);
  const prevConnected = previousGamepad ? previousGamepad.connected : false;

  if (payload.connected && !prevConnected) {
    gamepads.set(gamepad.index, gamepad);
    dispatchConnectionEvent('gamepadconnected', gamepad);
  } else if (!payload.connected && prevConnected) {
    gamepads.delete(gamepad.index);
    dispatchConnectionEvent('gamepaddisconnected', gamepad);
  } else {
    gamepads.set(gamepad.index, gamepad);
  }
};

export const setupGamepadListener = (): Promise<CleanupFn> => {
  navigator.getGamepads = getGamepads;

  return invokeCommand('start_gamepad_stream').then(() =>
    listen<GamepadData>(EVENT, handleGamepadEvent).catch((error: unknown): CleanupFn => {
      logError('Failed to listen for gamepad events:', error);
      toast.create({
        title: m.toasts_failed_to_listen_for_gamepad_events(),
        type: 'error',
      });
      return noopCleanup;
    }),
  );
};

type VibrateGamepadFn = (
  ...params: [index: number, weakMagnitude: number, strongMagnitude: number, duration: number]
) => Promise<void>;

export const vibrateGamepad: VibrateGamepadFn = (...params): Promise<void> => {
  const [index, weakMagnitude, strongMagnitude, duration] = params;

  return invokeCommand('gamepad_vibrate', {
    index,
    lowFreq: weakMagnitude,
    highFreq: strongMagnitude,
    durationMs: duration,
  }).then(resolveVoid);
};

type VibrateParams = {
  weakMagnitude: number;
  strongMagnitude: number;
  duration: number;
};

const CONFIRM_WEAK_MAGNITUDE = 0.2;
const CONFIRM_STRONG_MAGNITUDE = 0.9;
const CONFIRM_DURATION_MS = 60;

export const vibrateGamepadById = (
  gamepadId: string | null | undefined,
  params: VibrateParams,
): void => {
  if (typeof gamepadId !== 'string') {
    return;
  }
  const gamepad = [...navigator.getGamepads()].find((gp) => gp !== null && gp.id === gamepadId);
  if (!gamepad) {
    return;
  }
  invoke('gamepad_vibrate', {
    index: gamepad.index,
    lowFreq: params.weakMagnitude,
    highFreq: params.strongMagnitude,
    durationMs: params.duration,
  }).catch(() => null);
};

export const vibrateConfirm = (gamepadId: string | null | undefined): void => {
  vibrateGamepadById(gamepadId, {
    weakMagnitude: CONFIRM_WEAK_MAGNITUDE,
    strongMagnitude: CONFIRM_STRONG_MAGNITUDE,
    duration: CONFIRM_DURATION_MS,
  });
};

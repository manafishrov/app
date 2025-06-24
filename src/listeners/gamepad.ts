import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

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

function handleGamepadEvent(event: { payload: GamepadData }) {
  const { payload } = event;
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

async function initializeGamepadListener() {
  await invoke('execute_gamepad');
  navigator.getGamepads = getGamepads;

  await listen<GamepadData>('event', handleGamepadEvent);
}

void initializeGamepadListener();

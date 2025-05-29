import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export type PluginEvent = {
  id: number;
  uuid: string;
  connected: boolean;
  vibration: boolean;
  event: string | object;
  timestamp: number;
  name: string;
  buttons: ReadonlyArray<number>;
  axes: ReadonlyArray<number>;
  mapping: string;
  power_info: string;
};

type UnlistenFn = () => void;
type Callback = (response: PluginEvent) => void;
let callback: Callback | null = null;
let unlisten: UnlistenFn;

let gamepads: Gamepad[] = [];

export const getGamepads = () => {
  if (gamepads.length === 0) return [null, null, null, null];
  return gamepads;
};

const start = async () => {
  await invoke('execute_gamepad');
  navigator.getGamepads = getGamepads;

  unlisten = await listen<PluginEvent>(
    'event',
    (event: { payload: PluginEvent }) => {
      const { payload } = event;
      const gamepad = eventToGamepad(payload);
      let added = false;
      gamepads = gamepads.map((g) => {
        if (g.id === gamepad.id && g.index === gamepad.index) {
          added = true;
          return gamepad;
        }
        return g;
      });

      if (!added) gamepads.push(gamepad);

      if (payload.event === 'Connected') {
        const customEvent = new CustomEvent(
          'gamepadconnected',
        ) as CustomEvent & { gamepad?: Gamepad };
        customEvent.gamepad = gamepad;
        window.dispatchEvent(customEvent as GamepadEvent);
      }
      if (payload.event === 'Disconnected') {
        const customEvent = new CustomEvent(
          'gamepaddisconnected',
        ) as CustomEvent & { gamepad?: Gamepad };
        customEvent.gamepad = gamepad;
        window.dispatchEvent(customEvent as GamepadEvent);
        gamepads = gamepads.filter((g) => g.index !== gamepad.index);
      }
      if (callback !== null) callback(payload);
    },
  );
};

void start();

const eventToGamepad = (event: PluginEvent): Gamepad => {
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
};

export const execute = async (cb: Callback): Promise<UnlistenFn> => {
  callback = cb;
  return Promise.resolve(unlisten);
};

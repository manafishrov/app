import { toast } from '@manafishrov/ui/toaster';
import { invoke } from '@tauri-apps/api/core';
import { createStore, reconcile } from 'solid-js/store';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import {
  AttitudeIndicator,
  type Config,
  type GamepadBindings,
  type KeyboardBindings,
} from '@/stores/configTypes';
const createNullValue = (): null => {
  const result = /a/.exec('');
  if (Array.isArray(result)) {
    throw new TypeError('Expected null match result');
  }
  return result;
};

const NULL_VALUE = createNullValue();
const ignoreInvokeResult: (_result: unknown) => void = () => Number.NaN;

const createNullKeyboardBindings = (): KeyboardBindings => ({
  surgeForward: NULL_VALUE,
  surgeBackward: NULL_VALUE,
  swayRight: NULL_VALUE,
  swayLeft: NULL_VALUE,
  heaveUp: NULL_VALUE,
  heaveDown: NULL_VALUE,
  pitchUp: NULL_VALUE,
  pitchDown: NULL_VALUE,
  yawRight: NULL_VALUE,
  yawLeft: NULL_VALUE,
  rollLeft: NULL_VALUE,
  rollRight: NULL_VALUE,
  action1Positive: NULL_VALUE,
  action1Negative: NULL_VALUE,
  action2Positive: NULL_VALUE,
  action2Negative: NULL_VALUE,
  autoStabilization: NULL_VALUE,
  depthHold: NULL_VALUE,
  desiredDepthEntry: NULL_VALUE,
  desiredDepthIncrease: NULL_VALUE,
  desiredDepthDecrease: NULL_VALUE,
  record: NULL_VALUE,
});

const createNullGamepadBindings = (): GamepadBindings => ({
  surgeForward: NULL_VALUE,
  surgeBackward: NULL_VALUE,
  swayRight: NULL_VALUE,
  swayLeft: NULL_VALUE,
  heaveUp: NULL_VALUE,
  heaveDown: NULL_VALUE,
  pitchUp: NULL_VALUE,
  pitchDown: NULL_VALUE,
  yawRight: NULL_VALUE,
  yawLeft: NULL_VALUE,
  rollLeft: NULL_VALUE,
  rollRight: NULL_VALUE,
  action1Positive: NULL_VALUE,
  action1Negative: NULL_VALUE,
  action2Positive: NULL_VALUE,
  action2Negative: NULL_VALUE,
  autoStabilization: NULL_VALUE,
  depthHold: NULL_VALUE,
  desiredDepthEntry: NULL_VALUE,
  desiredDepthIncrease: NULL_VALUE,
  desiredDepthDecrease: NULL_VALUE,
  record: NULL_VALUE,
});

const defaultConfig: Config = {
  appVersion: m.common_not_available(),
  overlayScale: 2,
  attitudeIndicator: AttitudeIndicator.scientific,
  workIndicator: false,
  thrusterRpmOverlay: false,
  videoDirectory: '~/Movies/Manafish',
  ipAddress: '10.10.10.10',
  webrtcSignalingApiPort: 1984,
  webrtcSignalingApiPath: '/api/webrtc?src=cam',
  webSocketPort: 9000,
  checkForUpdatesOnStartup: true,
  keyboard: createNullKeyboardBindings(),
  selectedGamepadId: NULL_VALUE,
  gamepad: {},
};

const [configStore, setConfigStoreInternal] = createStore<Config>(defaultConfig);

const setConfigStore = (value: Config): void => {
  setConfigStoreInternal(reconcile(value));
};

const getConfig = (): Promise<void> =>
  invoke<Config>('get_config')
    .then((payload) => {
      setConfigStore(payload);
    })
    .catch((error: unknown) => {
      logError('Failed to get config:', error);
      toast.create({ title: m.toasts_failed_to_get_config(), type: 'error' });
    });

const setConfig = (newConfigOptions: Partial<Config>): Promise<void> => {
  const currentConfig = { ...configStore };
  const newConfig = { ...currentConfig, ...newConfigOptions };

  setConfigStore(newConfig);

  return invoke('set_config', { payload: newConfig })
    .catch((error: unknown) => {
      setConfigStore(currentConfig);
      logError('Failed to set config:', error);
      toast.create({ title: m.toasts_failed_to_set_config_reverted(), type: 'error' });
    })
    .then(ignoreInvokeResult);
};

export {
  configStore,
  setConfigStore,
  getConfig,
  setConfig,
  AttitudeIndicator,
  defaultConfig,
  createNullKeyboardBindings,
  createNullGamepadBindings,
};
export type {
  KeyboardKey,
  GamepadInputType,
  KeyboardInput,
  GamepadInput,
  KeyboardBindings,
  GamepadBindings,
  Config,
} from '@/stores/configTypes';

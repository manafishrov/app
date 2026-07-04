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
export { AttitudeIndicator, CustomActionTrigger } from '@/stores/configTypes';

const ignoreInvokeResult: (_result: unknown) => void = () => Number.NaN;

const createNullKeyboardBindings = (): KeyboardBindings => ({
  surgeForward: null,
  surgeBackward: null,
  swayRight: null,
  swayLeft: null,
  heaveUp: null,
  heaveDown: null,
  pitchUp: null,
  pitchDown: null,
  yawRight: null,
  yawLeft: null,
  rollLeft: null,
  rollRight: null,
  action1Positive: null,
  action1Negative: null,
  action2Positive: null,
  action2Negative: null,
  autoStabilization: null,
  depthHold: null,
  desiredDepthEntry: null,
  desiredDepthIncrease: null,
  desiredDepthDecrease: null,
  record: null,
});

const createNullGamepadBindings = (): GamepadBindings => ({
  surgeForward: null,
  surgeBackward: null,
  swayRight: null,
  swayLeft: null,
  heaveUp: null,
  heaveDown: null,
  pitchUp: null,
  pitchDown: null,
  yawRight: null,
  yawLeft: null,
  rollLeft: null,
  rollRight: null,
  action1Positive: null,
  action1Negative: null,
  action2Positive: null,
  action2Negative: null,
  autoStabilization: null,
  depthHold: null,
  desiredDepthEntry: null,
  desiredDepthIncrease: null,
  desiredDepthDecrease: null,
  record: null,
});

const defaultConfig: Config = {
  appVersion: m.common_not_available(),
  overlayScale: 2,
  attitudeIndicator: AttitudeIndicator.scientific,
  workIndicator: false,
  thrusterRpmOverlay: false,
  videoDirectory: '~/Movies/Manafish',
  checkForAppUpdatesOnStartup: true,
  ipAddress: '10.10.10.10',
  webrtcSignalingApiPort: 1984,
  webrtcSignalingApiPath: '/api/webrtc?src=cam',
  webSocketPort: 9000,
  keyboard: createNullKeyboardBindings(),
  customActions: [],
  selectedGamepadId: null,
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
  CustomActionBinding,
  Config,
} from '@/stores/configTypes';

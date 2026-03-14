import { createSignal, onCleanup, onMount, type Accessor } from 'solid-js';

import {
  clearAnimationFrame,
  createCaptureState,
  hasSelectedGamepadId,
  resetToDefaultBinding,
  startCaptureSession,
  stopRecording,
  updateProgressTick,
  type GamepadBindCaptureOptions,
  type ProgressTickContext,
} from './captureSession';

type GamepadCaptureController = {
  isRecording: Accessor<boolean>;
  progressValue: Accessor<number>;
  currentValue: Accessor<number>;
  hasGamepadSelected: Accessor<boolean>;
  startCapture: () => void;
  resetToDefault: () => void;
};

const ZERO = 0;

const useGamepadCapture = (options: GamepadBindCaptureOptions): GamepadCaptureController => {
  const [isRecording, setIsRecording] = createSignal<boolean>(false);
  const [progressValue, setProgressValue] = createSignal<number>(ZERO);
  const [currentValue, setCurrentValue] = createSignal<number>(ZERO);
  const state = createCaptureState();

  const startCapture = (): void => {
    startCaptureSession({ options, state, isRecording: isRecording(), setIsRecording });
  };

  onMount((): void => {
    const tick = (): void => {
      const context: ProgressTickContext = {
        options,
        state,
        isRecording: isRecording(),
        setProgressValue,
        setCurrentValue,
        setIsRecording,
      };
      updateProgressTick(context);
      state.animationFrameId = globalThis.requestAnimationFrame(tick);
    };
    state.animationFrameId = globalThis.requestAnimationFrame(tick);
  });

  onCleanup((): void => {
    state.animationFrameId = clearAnimationFrame(state.animationFrameId);
    stopRecording(state, setIsRecording);
  });

  const hasGamepadSelected = (): boolean => hasSelectedGamepadId(options.selectedGamepadId());

  const resetToDefault = (): void => {
    resetToDefaultBinding({ options, state, setIsRecording });
  };

  return {
    isRecording,
    progressValue,
    currentValue,
    hasGamepadSelected,
    startCapture,
    resetToDefault,
  };
};

export { useGamepadCapture };

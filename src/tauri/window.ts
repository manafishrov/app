import { type ListenerOptions, invokeCommand } from '@/tauri/core';

const SPLASH_OPTIONS: ListenerOptions = { warnOnly: true };

const ignoreError = (): void => {
  // Already logged by invokeCommand
};

export const closeSplashscreen = (): void => {
  invokeCommand('close_splashscreen', {}, SPLASH_OPTIONS).catch(ignoreError);
};

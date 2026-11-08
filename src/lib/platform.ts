/*
 * Tauri sets TAURI_ENV_PLATFORM while running the frontend dev/build command,
 * so platform checks resolve at build time and desktop-only code is dropped
 * from mobile bundles.
 */
const platform: unknown = import.meta.env['TAURI_ENV_PLATFORM'];

export const isMobile = platform === 'android' || platform === 'ios';

import { invokeCommand } from '@/tauri/core';

// Mobile only: the name of a picked photo folder, or of the platform default.
export const describePhotoDirectory = (directory: string): Promise<string> =>
  invokeCommand<string>('describe_photo_directory', { directory }, { warnOnly: true });

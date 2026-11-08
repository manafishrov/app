import { invokeCommand } from '@/tauri/core';

export type PickedVideoDirectory = {
  directory: string;
  name: string;
};

// Mobile only: folders come from the system picker as opaque access tokens.
export const pickVideoDirectory = (): Promise<PickedVideoDirectory | null> =>
  invokeCommand<PickedVideoDirectory | null>('pick_video_directory');

export const describeVideoDirectory = (directory: string): Promise<string> =>
  invokeCommand<string>('describe_video_directory', { directory }, { warnOnly: true });

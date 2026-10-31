import type { Component } from 'solid-js';

import { RecordingButton } from './RecordingButton';
import { SettingsLink } from './SettingsLink';
import { SystemHealthPopover } from './SystemHealthPopover';

/** The title bar actions, floating over the camera view on mobile. */
export const MobileToolbar: Component = () => (
  <div class='absolute top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-50 flex flex-col items-center gap-2 portrait:flex-row'>
    <SettingsLink isMac={false} />
    <SystemHealthPopover isMac={false} />
    <RecordingButton />
  </div>
);

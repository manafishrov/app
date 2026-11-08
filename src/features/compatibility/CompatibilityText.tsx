import { Show, type Component } from 'solid-js';

import { LEGACY_APP_VERSION, LEGACY_FIRMWARE_VERSION } from '@/lib/compatibility';
import { newestVersion } from '@/lib/version';
import * as m from '@/paraglide/messages';

export const legacyNotice = (): string =>
  m.compatibility_legacy_notice({ app: LEGACY_APP_VERSION, firmware: LEGACY_FIRMWARE_VERSION });

export const LegacyNotice: Component<{ when: boolean }> = (props) => (
  <Show when={props.when}>
    <p class='text-amber-600 dark:text-amber-400'>{legacyNotice()}</p>
  </Show>
);

export const CompatibleWithText: Component<{
  versions: string[];
  label: (inputs: { version: string }) => string;
}> = (props) => (
  <Show when={newestVersion(props.versions)}>
    {(version) => (
      <p class='text-xs text-muted-foreground'>{props.label({ version: version() })}</p>
    )}
  </Show>
);

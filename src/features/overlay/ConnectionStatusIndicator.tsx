import type { Component } from 'solid-js';

import * as m from '@/paraglide/messages';
import { connectionStatusStore } from '@/stores/connectionStatus';

const ConnectionStatusIndicator: Component = () => (
  <div class='overlay-surface overlay-reading'>
    <span class='flex items-center gap-2'>
      <span
        class={`size-1.5 shrink-0 rounded-full ${connectionStatusStore.isConnected ? 'bg-emerald-500' : 'bg-destructive'}`}
      />
      <span class='overlay-value'>
        {connectionStatusStore.isConnected
          ? `${connectionStatusStore.delay} ${m.units_milliseconds()}`
          : m.overlay_connection_offline()}
      </span>
    </span>
  </div>
);

export { ConnectionStatusIndicator };

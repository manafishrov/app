import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';

import * as m from '@/paraglide/messages';
import { connectionStatusStore } from '@/stores/connectionStatus';

const ConnectionStatusIndicator: Component = () => (
  <Badge
    variant={connectionStatusStore.isConnected ? 'secondary' : 'destructive'}
    class='h-auto min-h-5 min-w-[7rem] justify-start border-border/50 bg-background/50 py-1 whitespace-nowrap backdrop-blur-sm'
  >
    <div
      class={`mr-1.5 h-2 w-2 rounded-full ${
        connectionStatusStore.isConnected ? 'bg-green-500' : 'bg-destructive'
      }`}
    />
    {connectionStatusStore.isConnected
      ? `${connectionStatusStore.delay} ${m.units_milliseconds()}`
      : m.app_connection_disconnected()}
  </Badge>
);

export { ConnectionStatusIndicator };

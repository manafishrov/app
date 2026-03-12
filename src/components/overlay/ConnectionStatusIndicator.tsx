import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';

import * as m from '@/paraglide/messages';
import { connectionStatusStore } from '@/stores/connectionStatus';

const ConnectionStatusIndicator: Component = () => (
  <Badge
    variant={connectionStatusStore.isConnected ? 'secondary' : 'destructive'}
    class='bg-background/50 backdrop-blur-sm border-border/50'
  >
    <div
      class={`h-2 w-2 rounded-full mr-1.5 ${
        connectionStatusStore.isConnected ? 'bg-green-500' : 'bg-destructive'
      }`}
    />
    {connectionStatusStore.isConnected
      ? `${connectionStatusStore.delay} ${m.units_milliseconds()}`
      : m.app_connection_disconnected()}
  </Badge>
);

export { ConnectionStatusIndicator };

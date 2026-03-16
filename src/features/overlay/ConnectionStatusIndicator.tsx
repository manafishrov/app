import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';

import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';

const BASE_WIDTH_REM = 7;
const SCALE_MULTIPLIER = 0.25;

const ConnectionStatusIndicator: Component = () => {
  const badgeWidth = createMemo(
    () => `${BASE_WIDTH_REM + (configStore.overlayScale - 1) * SCALE_MULTIPLIER}rem`,
  );

  return (
    <Badge
      variant={connectionStatusStore.isConnected ? 'secondary' : 'destructive'}
      class='bg-background/50 backdrop-blur-sm border-border/50 whitespace-nowrap justify-start'
      style={{ width: badgeWidth() }}
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
};

export { ConnectionStatusIndicator };

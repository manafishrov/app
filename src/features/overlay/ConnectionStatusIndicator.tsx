import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';

import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';

const BASE_WIDTH_REM = 7;
const SCALE_MULTIPLIER = 2;

const ConnectionStatusIndicator: Component = () => {
  const badgeWidth = createMemo(
    () => `${BASE_WIDTH_REM + (configStore.overlayScale - 1) * SCALE_MULTIPLIER}rem`,
  );

  return (
    <Badge
      variant={connectionStatusStore.isConnected ? 'secondary' : 'destructive'}
      class='h-auto min-h-5 justify-start border-border/50 bg-background/50 py-1 whitespace-nowrap backdrop-blur-sm'
      style={{ 'min-width': badgeWidth() }}
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
};

export { ConnectionStatusIndicator };

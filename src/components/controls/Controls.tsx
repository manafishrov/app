import { useStore } from '@tanstack/react-store';

import { SettingsButton } from '@/components/controls/SettingsButton';
import { StabilizationButtons } from '@/components/controls/StabilizationButtons';

import { cx } from '@/lib/utils';

import { connectionStatusStore } from '@/stores/connectionStatus';

function Controls({ showControls }: { showControls: boolean }) {
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );
  return (
    <div
      className={cx(
        'z-10 transition-opacity hover:opacity-100',

        showControls ? 'opacity-100' : 'opacity-0',
      )}
    >
      <SettingsButton className='absolute top-2 right-2' />
      {isConnected && (
        <StabilizationButtons className='absolute bottom-2 left-2' />
      )}
    </div>
  );
}

export { Controls };

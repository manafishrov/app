import { useStore } from '@tanstack/react-store';
import {
  BatteryFullIcon,
  BatteryIcon,
  BatteryLowIcon,
  BatteryMediumIcon,
} from 'lucide-react';

import { cx } from '@/lib/utils';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';

function getBatteryIcon(percentage: number) {
  if (percentage > 70) return BatteryFullIcon;
  if (percentage > 40) return BatteryMediumIcon;
  if (percentage > 10) return BatteryLowIcon;
  return BatteryIcon;
}

function BatteryIndicator() {
  const batteryPercentage = useStore(
    rovStatusStore,
    (state) => state.batteryPercentage,
  );
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );

  const Icon = getBatteryIcon(batteryPercentage);

  if (!isConnected) return;

  return (
    <div
      className={cx(
        'flex w-14 items-center gap-1 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]',
        batteryPercentage < 10 && 'text-destructive',
      )}
    >
      <Icon
        className={cx('h-4 w-4', batteryPercentage < 10 && 'text-destructive')}
      />
      <span className='text-xs'>{batteryPercentage.toFixed(0)}%</span>
    </div>
  );
}

export { BatteryIndicator };

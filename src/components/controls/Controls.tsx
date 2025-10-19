import { SettingsButton } from '@/components/controls/SettingsButton';

import { cx } from '@/lib/utils';

function Controls({ showControls }: { showControls: boolean }) {
  return (
    <div
      className={cx(
        'z-10 h-full w-full transition-opacity hover:opacity-100',

        showControls ? 'opacity-100' : 'opacity-0',
      )}
    >
      <SettingsButton className='absolute top-2 right-2' />
    </div>
  );
}

export { Controls };

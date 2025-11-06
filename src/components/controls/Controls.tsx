import { RecordingButton } from '@/components/controls/RecordingButton';
import { SettingsButton } from '@/components/controls/SettingsButton';
import { StabilizationButtons } from '@/components/controls/StabilizationButtons';
import { SystemHealthPopover } from '@/components/controls/SystemHealthPopover';

import { cx } from '@/lib/utils';

function Controls({ showControls }: { showControls: boolean }) {
  return (
    <div
      className={cx(
        'z-10 transition-opacity hover:opacity-100',

        showControls ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className='absolute top-2 left-2'>
        <RecordingButton />
      </div>
      <div className='absolute top-2 right-2 flex gap-2'>
        <SystemHealthPopover />
        <SettingsButton />
      </div>
      <div className='absolute bottom-2 left-2'>
        <StabilizationButtons />
      </div>
    </div>
  );
}

export { Controls };

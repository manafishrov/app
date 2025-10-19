import { useRef, useState } from 'react';

import { SettingsButton } from '@/components/controls/SettingsButton';

import { cx } from '@/lib/utils';

function Controls() {
  const [showControls, setShowControls] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  function handleMouseMove() {
    setShowControls(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2000);
  }
  return (
    <div
      className={cx(
        'z-10 h-full w-full transition-opacity hover:opacity-100',

        showControls ? 'opacity-100' : 'opacity-0',
      )}
      onMouseMove={handleMouseMove}
    >
      <SettingsButton className='absolute top-2 right-2' />
    </div>
  );
}

export { Controls };

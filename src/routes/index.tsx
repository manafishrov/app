import { createFileRoute } from '@tanstack/react-router';
import { useLayoutEffect, useRef, useState } from 'react';

import { VideoStream } from '@/components/VideoStream';
import { SettingsButton } from '@/components/settings/SettingsButton';

import { useMovementCommand } from '@/hooks/useMovementCommand';

import { cx } from '@/lib/utils';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  useMovementCommand();

  const mainRef = useRef<HTMLElement>(null);
  const [sizeClass, setSizeClass] = useState<'w-full' | 'h-full'>('w-full');
  const [showSettingsLink, setShowSettingsLink] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useLayoutEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    function handleResize() {
      if (!mainEl) return;
      const style = window.getComputedStyle(mainEl);
      const paddingX =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const paddingY =
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

      const availableWidth = mainEl.clientWidth - paddingX;
      const availableHeight = mainEl.clientHeight - paddingY;

      const potentialDivHeight = (availableWidth * 3) / 4;

      if (potentialDivHeight > availableHeight) {
        setSizeClass('h-full');
      } else {
        setSizeClass('w-full');
      }
    }

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  function handleMouseMove() {
    setShowSettingsLink(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setShowSettingsLink(false);
    }, 2000);
  }

  return (
    <main
      ref={mainRef}
      className='flex h-full w-full items-center justify-center p-1'
    >
      <div
        className={cx(
          'bg-card dark text-foreground relative aspect-4/3 rounded-lg',
          sizeClass,
        )}
        onMouseMove={handleMouseMove}
      >
        <SettingsButton
          className={cx(
            'absolute top-2 left-2 z-10 transition-opacity',
            showSettingsLink ? 'opacity-100' : 'opacity-0',
            'hover:opacity-100',
          )}
        />
        <VideoStream />
      </div>
    </main>
  );
}

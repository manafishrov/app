import { createFileRoute } from '@tanstack/react-router';
import { useLayoutEffect, useRef, useState } from 'react';

import { VideoStream } from '@/components/VideoStream';
import { Controls } from '@/components/controls/Controls';
import { RovOverlay } from '@/components/overlay/RovOverlay';

import { useSendDirectionVector } from '@/hooks/useSendDirectionVector';
import { useSendStateUpdates } from '@/hooks/useSendStateUpdates';

import { cx } from '@/lib/utils';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  useSendDirectionVector();
  useSendStateUpdates();

  const mainRef = useRef<HTMLElement>(null);
  const [sizeClass, setSizeClass] = useState<'w-full' | 'h-full'>('w-full');
  const [showControls, setShowControls] = useState(false);
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
    setShowControls(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2000);
  }
  return (
    <main
      ref={mainRef}
      className='flex h-full w-full items-center justify-center p-1'
      onMouseMove={handleMouseMove}
    >
      <div
        className={cx(
          'bg-card dark text-foreground relative aspect-4/3 rounded-lg',
          sizeClass,
        )}
      >
        <VideoStream />
        <RovOverlay />
        <Controls showControls={showControls} />
      </div>
    </main>
  );
}

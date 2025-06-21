import { createFileRoute } from '@tanstack/react-router';
import { useLayoutEffect, useRef, useState } from 'react';

import { VideoStream } from '@/components/VideoStream';

import { useMovementCommand } from '@/hooks/useMovementCommand';

import { cx } from '@/lib/utils';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  useMovementCommand();

  const mainRef = useRef<HTMLElement>(null);
  const [sizeClass, setSizeClass] = useState<'w-full' | 'h-full'>('w-full');

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

  return (
    <main
      ref={mainRef}
      className='flex h-full w-full items-center justify-center p-1'
    >
      <div className={cx('bg-card relative aspect-4/3 rounded-lg', sizeClass)}>
        <VideoStream />
      </div>
    </main>
  );
}

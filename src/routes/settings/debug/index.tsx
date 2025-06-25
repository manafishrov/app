import { LazyLog, ScrollFollow } from '@melloware/react-logviewer';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

import {
  type DebugMessage,
  clearDebugMessages,
  getDebugMessages,
} from '@/lib/debug';

export const Route = createFileRoute('/settings/debug/')({
  component: Debug,
});

function formatLogMessage(log: DebugMessage): string {
  return `[${log.timestamp.toLocaleString()}] [${log.origin}] [${log.logType.toUpperCase()}]: ${
    log.message
  }`;
}

function Debug() {
  const logRef = useRef<LazyLog>(null);
  const [text, setText] = useState('');

  function handleClear() {
    void clearDebugMessages();
    logRef.current?.clear();
    setText('');
  }

  useEffect(() => {
    async function loadInitialLog() {
      const messages = await getDebugMessages();
      if (messages.length > 0) {
        const formattedLogs = messages.map(formatLogMessage).join('\n');
        setText(formattedLogs);
      }
    }
    void loadInitialLog();
  }, []);

  useEffect(() => {
    function handleNewMessage(event: Event) {
      const customEvent = event as CustomEvent<DebugMessage>;
      const newMessage = customEvent.detail;
      if (newMessage) {
        const formattedMessage = formatLogMessage(newMessage);
        logRef.current?.appendLines([formattedMessage]);
      }
    }

    window.addEventListener('debug-message', handleNewMessage);

    return () => {
      window.removeEventListener('debug-message', handleNewMessage);
    };
  }, []);

  return (
    <>
      <div className='mb-6 flex items-center justify-between'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-4xl font-extrabold tracking-tight'>Debug</h1>
          <p className='text-muted-foreground'>
            Debug console for the ROV and the application.
          </p>
        </div>
        <Button variant='outline' onClick={handleClear}>
          Clear Log
        </Button>
      </div>
      <div className='absolute left-0 h-full w-full px-8'>
        <div className='h-[80svh] w-full overflow-hidden rounded-xl'>
          <ScrollFollow
            startFollowing
            render={({ follow, onScroll }) => (
              <LazyLog
                ref={logRef}
                caseInsensitive
                enableSearch
                lineNumbers
                wrapLines
                extraLines={1}
                rowHeight={20}
                text={text}
                follow={follow}
                onScroll={onScroll}
              />
            )}
          />
        </div>
      </div>
    </>
  );
}

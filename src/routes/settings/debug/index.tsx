import { LazyLog, ScrollFollow } from '@melloware/react-logviewer';
import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';

import { type LogMessage, clearLogMessages, getLogMessages } from '@/lib/log';

import { configStore, updateConfig } from '@/stores/configStore';

export const Route = createFileRoute('/settings/debug/')({
  component: Debug,
});

const ANSI_RED = '\x1b[31m';
const ANSI_ORANGE = '\x1b[33m';
const ANSI_RESET = '\x1b[0m';

function formatLogMessage(log: LogMessage) {
  const date = new Date(log.timestamp);
  const timestamp = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

  let formattedMessage = `[${log.origin.toUpperCase()}] [${log.level.toUpperCase()}] [${timestamp}]: ${log.message}`;

  switch (log.level.toUpperCase()) {
    case 'ERROR':
      formattedMessage = `${ANSI_RED}${formattedMessage}${ANSI_RESET}`;
      break;
    case 'WARN':
      formattedMessage = `${ANSI_ORANGE}${formattedMessage}${ANSI_RESET}`;
      break;
  }

  return formattedMessage;
}

function Debug() {
  const config = useStore(configStore, (state) => state);
  const logRef = useRef<LazyLog>(null);
  const [text, setText] = useState('');

  function handleClear() {
    void clearLogMessages();
    logRef.current?.clear();
    setText('');
  }

  useEffect(() => {
    async function loadInitialLog() {
      const messages = await getLogMessages();
      if (messages.length > 0) {
        const formattedLogs = messages.map(formatLogMessage).join('\n');
        setText(formattedLogs);
      }
    }
    void loadInitialLog();
  }, []);

  useEffect(() => {
    function handleNewMessage(event: Event) {
      const customEvent = event as CustomEvent<LogMessage>;
      const newMessage = customEvent.detail;
      if (newMessage) {
        const formattedMessage = formatLogMessage(newMessage);
        logRef.current?.appendLines([formattedMessage]);
      }
    }

    window.addEventListener('logmessage', handleNewMessage);

    return () => {
      window.removeEventListener('logmessage', handleNewMessage);
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
      <div className='mb-4 flex items-center space-x-2'>
        <Switch
          id='info-logs'
          checked={config?.infoLogging ?? false}
          onCheckedChange={() =>
            updateConfig({ infoLogging: !config?.infoLogging })
          }
        />
        <Label htmlFor='info-logs'>Enable Info level Logging</Label>
      </div>
      <div className='absolute left-0 h-full w-full px-8'>
        <div className='h-[calc(100svh-10rem)] w-full overflow-hidden rounded-t-xl'>
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

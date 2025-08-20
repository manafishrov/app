import { LazyLog, ScrollFollow } from '@melloware/react-logviewer';
import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';

import {
  type LogRecord,
  clearAllLogRecords,
  getAllLogRecords,
} from '@/lib/log';

import { configStore, setConfig } from '@/stores/config';

export const Route = createFileRoute('/settings/debug/')({
  component: Debug,
});

const ANSI_RED = '\x1b[31m';
const ANSI_ORANGE = '\x1b[33m';
const ANSI_RESET = '\x1b[0m';

function formatLogRecord(log: LogRecord) {
  const date = new Date(log.timestamp);
  const timestamp = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

  let formattedRecord = `[${log.origin.toUpperCase()}] [${log.level.toUpperCase()}] [${timestamp}]: ${log.message}`;

  switch (log.level.toUpperCase()) {
    case 'ERROR':
      formattedRecord = `${ANSI_RED}${formattedRecord}${ANSI_RESET}`;
      break;
    case 'WARN':
      formattedRecord = `${ANSI_ORANGE}${formattedRecord}${ANSI_RESET}`;
      break;
  }

  return formattedRecord;
}

function Debug() {
  const infoLogging = useStore(configStore, (state) => state?.infoLogging);
  const logRef = useRef<LazyLog>(null);
  const [text, setText] = useState('');

  function handleHighlight(range: unknown, logText: string) {
    let arr: number[] | undefined;
    if (Array.isArray(range)) {
      arr = range;
    } else if (
      range &&
      typeof range === 'object' &&
      'toArray' in range &&
      typeof (range as { toArray?: unknown }).toArray === 'function'
    ) {
      arr = (range as { toArray: () => unknown }).toArray() as number[];
    } else if (
      range &&
      typeof range === 'object' &&
      'toJS' in range &&
      typeof (range as { toJS?: unknown }).toJS === 'function'
    ) {
      arr = (range as { toJS: () => unknown }).toJS() as number[];
    } else {
      arr = undefined;
    }
    if (!arr || arr.length === 0) return;
    const lines = logText.split('\n');
    const selectedText = arr
      .map((lineNumber: number) => lines[lineNumber] ?? '')
      .filter((line: string) => line !== '')
      .join('\n');
    if (selectedText) {
      console.log(selectedText);
      void navigator.clipboard.writeText(selectedText);
    }
  }

  function handleClear() {
    void clearAllLogRecords();
    logRef.current?.clear();
    setText('');
  }

  useEffect(() => {
    async function loadInitialLog() {
      const logRecords = await getAllLogRecords();
      if (logRecords.length > 0) {
        const formattedLogs = logRecords.map(formatLogRecord).join('\n');
        setText(formattedLogs);
      }
    }
    void loadInitialLog();
  }, []);

  useEffect(() => {
    function handleNewLogRecord(event: Event) {
      const customEvent = event as CustomEvent<LogRecord>;
      const newRecord = customEvent.detail;
      if (newRecord) {
        const formattedReord = formatLogRecord(newRecord);
        logRef.current?.appendLines([formattedReord]);
      }
    }

    window.addEventListener('log:added', handleNewLogRecord);

    return () => {
      window.removeEventListener('log:added', handleNewLogRecord);
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
          checked={infoLogging ?? false}
          onCheckedChange={() => setConfig({ infoLogging: !infoLogging })}
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
                selectableLines
                extraLines={1}
                rowHeight={20}
                text={text}
                follow={follow}
                onScroll={onScroll}
                onHighlight={(range) => handleHighlight(range, text)}
              />
            )}
          />
        </div>
      </div>
    </>
  );
}

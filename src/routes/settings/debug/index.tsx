import { Button } from '@manafishrov/ui/button';
import { Switch } from '@manafishrov/ui/switch';
import { toast } from '@manafishrov/ui/toaster';
import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';
import { type Component } from 'solid-js';

import { clearAllLogRecords } from '@/lib/log';
import { configStore } from '@/stores/config';
import { setConfig } from '@/tauri';

// import { LazyLog, ScrollFollow } from '@melloware/react-logviewer';

const Debug: Component = () => {
  const infoLogging = () => configStore.infoLogging;

  const handleClear = () => {
    void clearAllLogRecords();
    toast.create({ title: 'Log cleared', type: 'success' });
  };

  return (
    <>
      <div class='mb-6 flex items-center justify-between'>
        <div class='flex flex-col gap-2'>
          <H1>Debug</H1>
          <P>Debug console for the ROV and the application.</P>
        </div>
        <Button variant='outline' onClick={handleClear}>
          Clear Log
        </Button>
      </div>
      <div class='mb-4 flex items-center space-x-2'>
        <Switch
          id='info-logs'
          checked={infoLogging() ?? false}
          onChange={() => setConfig({ infoLogging: !infoLogging() })}
        />
        <label for='info-logs'>Enable Info level Logging</label>
      </div>
      <div class='absolute left-0 h-full w-full px-8'>
        <div class='h-[calc(100svh-10rem)] w-full overflow-hidden rounded-t-xl'>
          {/* <LazyLog /> - React component commented out */}
          <div class='flex h-full items-center justify-center text-muted-foreground'>
            Log viewer component needs to be migrated to SolidJS
          </div>
        </div>
      </div>
    </>
  );
};

export const Route = createFileRoute('/settings/debug/')({
  component: Debug,
});

import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { LogViewer } from '@/features/logViewer';
import * as m from '@/paraglide/messages';

const DebugSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex items-center justify-between'>
      <div class='flex flex-col gap-2'>
        <H1>{m.debug_page_title()}</H1>
        <P>{m.debug_page_description()}</P>
      </div>
    </div>
    <div class='relative left-1/2 w-[100cqw] -translate-x-1/2 px-4 md:px-8'>
      <LogViewer class='h-[calc(100svh-12rem)]' />
    </div>
  </>
);

export const Route = createFileRoute('/settings/debug/')({
  component: DebugSettingsPage,
});

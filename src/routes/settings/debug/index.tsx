import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { LogViewer } from '@/components/debug/LogViewer';

const Debug: Component = () => (
  <>
    <div class='mb-6 flex items-center justify-between'>
      <div class='flex flex-col gap-2'>
        <H1>Debug</H1>
        <P>Debug console for the firmware and the application.</P>
      </div>
    </div>
    <LogViewer class='h-[calc(100svh-14rem)]' />
  </>
);

export const Route = createFileRoute('/settings/debug/')({
  component: Debug,
});

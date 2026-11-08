import type { Component } from 'solid-js';

import { P } from '@manafishrov/ui/typography';

import { isMobile } from '@/lib/platform';
import * as m from '@/paraglide/messages';

import { ClassFilter } from './ClassFilter';
import { DetectionOptions } from './DetectionOptions';
import { DetectionStatus } from './DetectionStatus';
import { ModelLibrary } from './ModelLibrary';

export const Detection: Component = () => (
  <div class='flex flex-col gap-10'>
    <Show when={isMobile}>
      <P class='text-sm text-muted-foreground'>{m.detection_mobile_hint()}</P>
    </Show>
    <DetectionOptions />
    <DetectionStatus />
    <ModelLibrary />
    <ClassFilter />
  </div>
);

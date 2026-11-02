import type { Component } from 'solid-js';

import { ClassFilter } from './ClassFilter';
import { DetectionOptions } from './DetectionOptions';
import { DetectionStatus } from './DetectionStatus';
import { ModelLibrary } from './ModelLibrary';

export const Detection: Component = () => (
  <div class='flex flex-col gap-10'>
    <DetectionOptions />
    <DetectionStatus />
    <ModelLibrary />
    <ClassFilter />
  </div>
);

import type { Component } from 'solid-js';

import { capabilityStore } from '@/stores/capabilities';

import { CustomActionWorkspace } from './CustomActionWorkspace';

export const CustomActionsPage: Component = () => (
  <div class='flex min-h-0 min-w-0 flex-col gap-3'>
    <Show when={capabilityStore.error}>
      <p role='alert' class='text-sm text-destructive'>
        {capabilityStore.error}
      </p>
    </Show>
    <CustomActionWorkspace />
  </div>
);

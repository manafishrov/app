import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';

import { CustomActionInstructions } from './CustomActionInstructions';
import { CustomActionWorkspace } from './CustomActionWorkspace';

export const CustomActionsPage: Component = () => (
  <div class='flex min-w-0 flex-col gap-5'>
    <header class='flex flex-col gap-2'>
      <H1>{m.custom_action_scripts_title()}</H1>
      <P>{m.custom_action_scripts_description()}</P>
    </header>
    <CustomActionInstructions />
    <Show when={capabilityStore.error}>
      <p role='alert' class='text-sm text-destructive'>
        {capabilityStore.error}
      </p>
    </Show>
    <CustomActionWorkspace />
  </div>
);

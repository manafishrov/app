import type { Component } from 'solid-js';

import { H1, P } from '@manafishrov/ui/typography';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';

import { ExtensionInstructions } from './ExtensionInstructions';
import { ExtensionWorkspace } from './ExtensionWorkspace';

export const CustomActionsPage: Component = () => (
  <div class='flex min-w-0 flex-col gap-5'>
    <header class='flex flex-col gap-2'>
      <H1>{m.extensions_title()}</H1>
      <P>{m.extensions_description()}</P>
    </header>
    <ExtensionInstructions />
    <Show when={capabilityStore.error}>
      <p role='alert' class='text-sm text-destructive'>
        {capabilityStore.error}
      </p>
    </Show>
    <ExtensionWorkspace />
  </div>
);

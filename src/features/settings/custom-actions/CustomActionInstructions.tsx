import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import CopyIcon from '~icons/material-symbols/content-copy';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';

import { buildAgentInstructions } from './instructions';
import { OperationFeedback } from './OperationFeedback';
import { createOperation } from './operations';

export const CustomActionInstructions: Component = () => {
  const operation = createOperation();
  return (
    <div>
      <Button
        variant='ghost'
        size='sm'
        disabled={operation.busy()}
        onClick={() => {
          operation.run(
            () => navigator.clipboard.writeText(buildAgentInstructions(capabilityStore.catalog)),
            m.custom_action_scripts_copied(),
          );
        }}
      >
        <CopyIcon class='size-4' />
        {m.custom_action_scripts_copy()}
      </Button>
      <OperationFeedback operation={operation} />
    </div>
  );
};

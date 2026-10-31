import type { Component } from 'solid-js';

import {
  Accordion,
  AccordionContent,
  AccordionIndicator,
  AccordionItem,
  AccordionTrigger,
} from '@manafishrov/ui/accordion';
import { Button } from '@manafishrov/ui/button';
import CopyIcon from '~icons/material-symbols/content-copy';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';

import { buildAgentInstructions, guide } from './instructions';
import { OperationFeedback } from './OperationFeedback';
import { createOperation } from './operations';

export const CustomActionInstructions: Component = () => {
  const operation = createOperation();
  return (
    <section>
      <Accordion collapsible>
        <AccordionItem value='instructions'>
          <div class='flex items-center gap-3'>
            <AccordionTrigger class='min-w-0 flex-1'>
              {m.custom_action_scripts_instructions()}
              <AccordionIndicator />
            </AccordionTrigger>
            <Button
              variant='ghost'
              size='sm'
              class='shrink-0 gap-2'
              disabled={operation.busy()}
              onClick={() => {
                operation.run(
                  () =>
                    navigator.clipboard.writeText(buildAgentInstructions(capabilityStore.catalog)),
                  m.custom_action_scripts_copied(),
                );
              }}
            >
              <CopyIcon class='size-4' />
              {m.custom_action_scripts_copy()}
            </Button>
          </div>
          <AccordionContent>
            <pre class='max-h-96 overflow-auto font-sans text-sm leading-relaxed break-words whitespace-pre-wrap text-muted-foreground'>
              {guide}
            </pre>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <OperationFeedback operation={operation} />
    </section>
  );
};

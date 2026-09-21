import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import AddIcon from '~icons/material-symbols/add';

import type { OverlayWidgetType } from '@/stores/overlayTypes';

import {
  overlayWidgetDefinitions,
  type OverlayWidgetDefinition,
} from '@/features/overlay/widgets/Registry';
import * as m from '@/paraglide/messages';

type WidgetPaletteProps = {
  onAdd: (type: OverlayWidgetType) => void;
};

const PaletteEntry: Component<{
  definition: OverlayWidgetDefinition;
  onAdd: (type: OverlayWidgetType) => void;
}> = (props) => (
  <Button
    type='button'
    variant='outline'
    size='sm'
    class='justify-start gap-2'
    onClick={() => {
      props.onAdd(props.definition.type);
    }}
  >
    <Dynamic component={props.definition.Icon} class='size-4 shrink-0' />
    <span class='truncate'>{props.definition.label()}</span>
    <AddIcon class='ml-auto size-4 shrink-0 opacity-60' />
  </Button>
);

/**
 * Every widget the app knows how to draw. Entries come from the registry, so a
 * future telemetry-driven widget appears here without touching this file.
 */
const WidgetPalette: Component<WidgetPaletteProps> = (props) => (
  <div class='flex flex-col gap-2'>
    <span class='text-sm font-medium'>{m.overlay_layout_palette_title()}</span>
    <span class='text-xs text-muted-foreground'>{m.overlay_layout_palette_description()}</span>
    <div class='mt-1 flex flex-col gap-1.5'>
      <For each={overlayWidgetDefinitions}>
        {(definition) => <PaletteEntry definition={definition} onAdd={props.onAdd} />}
      </For>
    </div>
  </div>
);

export { WidgetPalette };

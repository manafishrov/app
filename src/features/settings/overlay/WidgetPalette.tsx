import type { Component } from 'solid-js';

import AddIcon from '~icons/material-symbols/add';

import { OverlayPreviewProvider } from '@/features/overlay/OverlayPreview';
import {
  overlayWidgetDefinitions,
  type OverlayWidgetDefinition,
} from '@/features/overlay/widgets/Registry';
import { WidgetContent } from '@/features/overlay/widgets/WidgetContent';
import * as m from '@/paraglide/messages';
import { OverlayAnchor, type OverlayWidget, type OverlayWidgetType } from '@/stores/overlayTypes';

type WidgetPaletteProps = { onAdd: (type: OverlayWidgetType) => void };

const previewWidget = (definition: OverlayWidgetDefinition): OverlayWidget => ({
  id: `preview-${definition.type}`,
  type: definition.type,
  column: 1,
  row: 1,
  columnSpan: definition.defaultColumnSpan,
  rowSpan: definition.defaultRowSpan,
  anchor: OverlayAnchor.center,
  options: { ...definition.defaultOptions },
});

const PaletteEntry: Component<{
  definition: OverlayWidgetDefinition;
  onAdd: (type: OverlayWidgetType) => void;
}> = (props) => (
  <div
    class='group relative min-w-0 rounded-lg border border-border/60 bg-muted/30'
    data-widget-preview={props.definition.type}
  >
    <div class='pointer-events-none h-28 overflow-hidden p-3 sm:h-32' inert aria-hidden='true'>
      <WidgetContent widget={previewWidget(props.definition)} anchor={OverlayAnchor.center} preview>
        <Dynamic component={props.definition.Render} widget={previewWidget(props.definition)} />
      </WidgetContent>
    </div>
    <div class='pointer-events-none flex h-12 items-center justify-between gap-2 border-t border-border/40 px-3 py-2'>
      <span class='text-xs font-medium'>{props.definition.label()}</span>
      <AddIcon class='size-4 shrink-0 text-muted-foreground group-hover:text-foreground' />
    </div>
    <button
      type='button'
      class='absolute inset-0 cursor-pointer rounded-lg transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none'
      aria-label={m.overlay_layout_add_widget({ name: props.definition.label() })}
      onClick={() => {
        props.onAdd(props.definition.type);
      }}
    />
  </div>
);

/** Actual component previews, with interaction reserved for adding to the layout. */
const WidgetPalette: Component<WidgetPaletteProps> = (props) => (
  <section
    class='overlay-palette flex flex-col gap-4'
    aria-label={m.overlay_layout_palette_title()}
    data-widget-gallery
  >
    <div class='flex flex-col gap-1'>
      <h2 class='text-base font-medium'>{m.overlay_layout_palette_title()}</h2>
      <p class='text-sm text-muted-foreground'>{m.overlay_layout_palette_description()}</p>
    </div>
    <OverlayPreviewProvider palette>
      <div class='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4'>
        <For each={overlayWidgetDefinitions}>
          {(definition) => <PaletteEntry definition={definition} onAdd={props.onAdd} />}
        </For>
      </div>
    </OverlayPreviewProvider>
  </section>
);

export { WidgetPalette };

import type { Component } from 'solid-js';

import { Separator } from '@manafishrov/ui/separator';

import type { GridSpan } from '@/stores/overlayLayout';
import type {
  OverlayAnchor,
  OverlayWidget,
  OverlayWidgetOptions,
  OverlayWidgetType,
} from '@/stores/overlayTypes';

import * as m from '@/paraglide/messages';

import { WidgetInspector } from './WidgetInspector';
import { WidgetPalette } from './WidgetPalette';

type EditorSidebarProps = {
  selected: OverlayWidget | undefined;
  limits: { maxColumnSpan: number; maxRowSpan: number };
  onAnchorChange: (anchor: OverlayAnchor) => void;
  onSpanChange: (span: GridSpan) => void;
  onOptionsChange: (options: OverlayWidgetOptions) => void;
  onRemove: () => void;
  onAdd: (type: OverlayWidgetType) => void;
};

/** Inspector for the selected widget, plus the palette of everything else. */
const EditorSidebar: Component<EditorSidebarProps> = (props) => (
  <div class='flex w-full shrink-0 flex-col gap-4 lg:w-64'>
    <Show
      when={props.selected}
      fallback={
        <span class='text-xs text-muted-foreground'>{m.overlay_layout_no_selection()}</span>
      }
    >
      {(widget) => (
        <>
          <WidgetInspector
            widget={widget()}
            limits={props.limits}
            onAnchorChange={props.onAnchorChange}
            onSpanChange={props.onSpanChange}
            onOptionsChange={props.onOptionsChange}
            onRemove={props.onRemove}
          />
          <Separator />
        </>
      )}
    </Show>

    <WidgetPalette onAdd={props.onAdd} />
  </div>
);

export { EditorSidebar };

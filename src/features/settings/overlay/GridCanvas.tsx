import type { Component, JSXElement } from 'solid-js';

import { AspectRatio } from '@manafishrov/ui/aspect-ratio';

import type { OverlayLayout, OverlayWidget } from '@/stores/overlayTypes';

import { OverlayGrid, overlayAnchorClass } from '@/features/overlay/OverlayGrid';
import { OverlayPreviewProvider } from '@/features/overlay/OverlayPreview';
import { createOverlayScale } from '@/features/overlay/overlayScale';
import * as m from '@/paraglide/messages';

import type { GridCell } from './placement';

import { createDragController, type DragController } from './dragController';

const ASPECT_RATIO_WIDTH = 4;
const ASPECT_RATIO_HEIGHT = 3;
const ASPECT_RATIO = ASPECT_RATIO_WIDTH / ASPECT_RATIO_HEIGHT;

const [undef] = [] as undefined[];

type GridCanvasProps = {
  layout: OverlayLayout;
  selectedId: string | undefined;
  onSelect: (widgetId: string | undefined) => void;
  /** Called continuously while dragging; the editor commits on drop. */
  onMove: (widgetId: string, cell: GridCell) => void;
  onDrop: () => void;
};

/** Faint cell guides, so the grid is visible while arranging. */
const GridGuides: Component<{ columns: number; rows: number }> = (props) => (
  <div
    aria-hidden='true'
    class='absolute inset-0 opacity-40'
    style={{
      'background-image':
        'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
      'background-size': `calc(100% / ${props.columns}) calc(100% / ${props.rows})`,
    }}
  />
);

const DraggableWidget: Component<{
  widget: OverlayWidget;
  selected: boolean;
  content: JSXElement;
  onPointerDown: (event: PointerEvent, widget: OverlayWidget) => void;
  onSelect: (widgetId: string) => void;
}> = (props) => (
  <div
    role='button'
    tabindex={0}
    aria-label={props.widget.id}
    aria-pressed={props.selected}
    class={`pointer-events-auto flex h-full w-full cursor-grab touch-none rounded-sm ${overlayAnchorClass(
      props.widget.anchor,
    )} ${
      props.selected
        ? 'bg-primary/10 ring-2 ring-primary'
        : 'hover:bg-foreground/5 hover:ring-1 hover:ring-border'
    }`}
    onPointerDown={(event) => {
      props.onPointerDown(event, props.widget);
    }}
    onFocus={() => {
      props.onSelect(props.widget.id);
    }}
  >
    {props.content}
  </div>
);

/**
 * Pointer events pass through empty cells so the deselect target underneath
 * stays reachable; each widget re-enables them for itself.
 */
const CanvasWidgets: Component<{
  props: GridCanvasProps;
  drag: DragController;
  setCanvas: (element: HTMLElement) => void;
  scale: number;
}> = (outer) => (
  <div
    ref={outer.setCanvas}
    class='pointer-events-none absolute inset-0 p-4'
    onPointerMove={outer.drag.onPointerMove}
    onPointerUp={outer.drag.onPointerUp}
    onPointerCancel={outer.drag.onPointerUp}
  >
    <OverlayPreviewProvider>
      <OverlayGrid
        layout={outer.props.layout}
        scale={outer.scale}
        renderWidget={(widget, content) => (
          <DraggableWidget
            widget={widget}
            selected={outer.props.selectedId === widget.id}
            content={content}
            onPointerDown={outer.drag.onWidgetPointerDown}
            onSelect={outer.props.onSelect}
          />
        )}
      />
    </OverlayPreviewProvider>
  </div>
);

const GridCanvas: Component<GridCanvasProps> = (props) => {
  const [canvas, setCanvas] = createSignal<HTMLElement>();
  const scale = createOverlayScale(canvas);

  const drag = createDragController({
    canvas,
    grid: () => ({ columns: props.layout.columns, rows: props.layout.rows }),
    onSelect: props.onSelect,
    onMove: props.onMove,
    onDrop: props.onDrop,
  });

  return (
    <AspectRatio
      ratio={ASPECT_RATIO}
      class='relative w-full overflow-hidden rounded-lg border border-border bg-muted'
    >
      <GridGuides columns={props.layout.columns} rows={props.layout.rows} />

      {/* Clicking an empty cell clears the selection. */}
      <button
        type='button'
        aria-label={m.overlay_layout_canvas_label()}
        class='absolute inset-0 cursor-default'
        onPointerDown={() => {
          props.onSelect(undef);
        }}
      />

      <CanvasWidgets props={props} drag={drag} setCanvas={setCanvas} scale={scale()} />
    </AspectRatio>
  );
};

export { GridCanvas };

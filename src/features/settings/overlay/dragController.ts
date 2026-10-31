import { createSignal, type Accessor, type Setter } from 'solid-js';

import type { OverlayWidget } from '@/stores/overlayTypes';

import {
  dragTargetCell,
  grabOffset,
  type DragState,
  type GridCell,
  type GridSize,
  type PointerPosition,
} from './placement';

const [undef] = [] as undefined[];

export type DragController = {
  onWidgetPointerDown: (event: PointerEvent, widget: OverlayWidget) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
};

type DragControllerOptions = {
  canvas: Accessor<HTMLElement | undefined>;
  grid: Accessor<GridSize>;
  onSelect: (widgetId: string) => void;
  onMove: (widgetId: string, cell: GridCell) => void;
  onDrop: () => void;
};

type DragContext = {
  drag: Accessor<DragState | undefined>;
  setDrag: Setter<DragState | undefined>;
  positionFor: (event: PointerEvent) => PointerPosition | undefined;
  options: DragControllerOptions;
};

const startDrag =
  (context: DragContext) =>
  (event: PointerEvent, widget: OverlayWidget): void => {
    const position = context.positionFor(event);
    if (position === undef || !(event.currentTarget instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    context.options.onSelect(widget.id);
    event.currentTarget.focus();
    const canvas = context.options.canvas();
    if (canvas !== undef) {
      canvas.setPointerCapture(event.pointerId);
    }

    context.setDrag({
      widgetId: widget.id,
      columnSpan: widget.columnSpan,
      rowSpan: widget.rowSpan,
      ...grabOffset(position, widget),
    });
  };

const continueDrag =
  (context: DragContext) =>
  (event: PointerEvent): void => {
    const active = context.drag();
    const position = context.positionFor(event);
    if (active === undef || position === undef) {
      return;
    }

    context.options.onMove(active.widgetId, dragTargetCell(active, position));
  };

const endDrag =
  (context: DragContext) =>
  (event: PointerEvent): void => {
    if (context.drag() === undef) {
      return;
    }
    if (
      event.currentTarget instanceof HTMLElement &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    context.setDrag(undef);
    context.options.onDrop();
  };

/**
 * Pointer-drag behaviour for the layout canvas, kept out of the component so
 * the JSX stays readable and the maths stays in `placement.ts`.
 */
export const createDragController = (options: DragControllerOptions): DragController => {
  const [drag, setDrag] = createSignal<DragState>();

  const positionFor = (event: PointerEvent): PointerPosition | undefined => {
    const element = options.canvas();
    if (element === undef) {
      return undef;
    }

    return {
      rect: element.getBoundingClientRect(),
      clientX: event.clientX,
      clientY: event.clientY,
      grid: options.grid(),
    };
  };

  const context: DragContext = { drag, setDrag, positionFor, options };

  return {
    onWidgetPointerDown: startDrag(context),
    onPointerMove: continueDrag(context),
    onPointerUp: endDrag(context),
  };
};

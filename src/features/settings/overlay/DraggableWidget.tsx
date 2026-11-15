import type { Component, JSXElement } from 'solid-js';

import CloseIcon from '~icons/material-symbols/close';

import { getOverlayWidgetDefinition } from '@/features/overlay/widgets/Registry';
import * as m from '@/paraglide/messages';
import { OVERLAY_GRID_ROWS, type OverlayWidget } from '@/stores/overlayTypes';

const HALF = 0.5;

/** Widgets in the upper half show their remove button below, where there is room. */
const removeBelow = (widget: OverlayWidget): boolean =>
  widget.row - 1 + widget.rowSpan * HALF < OVERLAY_GRID_ROWS * HALF;

const widgetLabel = (widget: OverlayWidget): string => {
  const definition = getOverlayWidgetDefinition(widget.type);
  return widget.options.label ?? (definition ? definition.label() : widget.type);
};

type DraggableWidgetProps = {
  widget: OverlayWidget;
  selected: boolean;
  content: JSXElement;
  onPointerDown: (event: PointerEvent, widget: OverlayWidget) => void;
  onSelect: (widgetId: string) => void;
  onRemove: (widgetId: string) => void;
};

const DraggableWidget: Component<DraggableWidgetProps> = (props) => (
  <div
    class='overlay-editor-widget relative h-full w-full'
    data-selected={props.selected}
    data-remove-below={removeBelow(props.widget)}
  >
    <div
      role='button'
      tabindex={0}
      aria-label={widgetLabel(props.widget)}
      aria-pressed={props.selected}
      class='overlay-selection pointer-events-auto'
      onPointerDown={(event) => {
        props.onPointerDown(event, props.widget);
      }}
      onFocus={() => {
        props.onSelect(props.widget.id);
      }}
    >
      <div class='h-full w-full' inert>
        {props.content}
      </div>
    </div>
    <button
      type='button'
      class='overlay-remove pointer-events-auto'
      aria-label={m.overlay_layout_remove_named({ name: widgetLabel(props.widget) })}
      onFocus={() => {
        props.onSelect(props.widget.id);
      }}
      onClick={() => {
        props.onRemove(props.widget.id);
      }}
    >
      <CloseIcon class='size-3' />
    </button>
  </div>
);

export { DraggableWidget };

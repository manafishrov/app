/**
 * Renders a layout's widgets onto the camera-sized grid.
 *
 * Shared by the live overlay and the settings editor so what you arrange is
 * exactly what you fly with.
 */

import type { Component, JSXElement } from 'solid-js';

import { OverlayAnchor, type OverlayLayout, type OverlayWidget } from '@/stores/overlayTypes';

import { getOverlayWidgetDefinition } from './widgets/Registry';

const anchorClasses: Record<OverlayAnchor, string> = {
  topLeft: 'items-start justify-start',
  top: 'items-start justify-center',
  topRight: 'items-start justify-end',
  left: 'items-center justify-start',
  center: 'items-center justify-center',
  right: 'items-center justify-end',
  bottomLeft: 'items-end justify-start',
  bottom: 'items-end justify-center',
  bottomRight: 'items-end justify-end',
};

export const overlayAnchorClass = (anchor: OverlayAnchor): string =>
  anchorClasses[anchor] ?? anchorClasses[OverlayAnchor.topLeft];

export const overlayGridArea = (widget: OverlayWidget): Record<string, string> => ({
  'grid-column': `${widget.column} / span ${widget.columnSpan}`,
  'grid-row': `${widget.row} / span ${widget.rowSpan}`,
});

type OverlayGridProps = {
  layout: OverlayLayout;
  /** Ties widget size to camera size; see `overlayScaleForWidth`. */
  scale: number;
  class?: string;
  /** Lets the editor wrap each widget with selection and drag affordances. */
  renderWidget?: (widget: OverlayWidget, content: JSXElement) => JSXElement;
};

const OverlayGrid: Component<OverlayGridProps> = (props) => (
  <div
    class={`grid h-full w-full ${props.class ?? ''}`}
    style={{
      'grid-template-columns': `repeat(${props.layout.columns}, 1fr)`,
      'grid-template-rows': `repeat(${props.layout.rows}, 1fr)`,
    }}
  >
    <For each={props.layout.widgets}>
      {(widget) => {
        const definition = createMemo(() => getOverlayWidgetDefinition(widget.type));

        return (
          <Show when={definition()}>
            {(resolved) => {
              const content = (
                <div style={{ zoom: props.scale }}>
                  <Dynamic component={resolved().Render} widget={widget} />
                </div>
              );

              return (
                <div
                  class={`flex min-h-0 min-w-0 ${overlayAnchorClass(widget.anchor)}`}
                  style={overlayGridArea(widget)}
                >
                  {props.renderWidget ? props.renderWidget(widget, content) : content}
                </div>
              );
            }}
          </Show>
        );
      }}
    </For>
  </div>
);

export { OverlayGrid };

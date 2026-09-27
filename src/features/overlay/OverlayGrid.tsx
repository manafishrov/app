import type { Component, JSXElement } from 'solid-js';

import type { OverlayLayout, OverlayWidget } from '@/stores/overlayTypes';

import { getOverlayWidgetDefinition } from './widgets/Registry';
import { WidgetContent } from './widgets/WidgetContent';
import './overlay.css';

export const overlayGridArea = (widget: OverlayWidget): Record<string, string> => ({
  'grid-column': `${widget.column} / span ${widget.columnSpan}`,
  'grid-row': `${widget.row} / span ${widget.rowSpan}`,
});

const [undef] = [] as undefined[];

type OverlayGridProps = {
  layout: OverlayLayout;
  guides?: boolean;
  renderWidget?: (widget: OverlayWidget, content: JSXElement) => JSXElement;
};

/** Placement, guides and pointer coordinates all use the full camera rectangle. */
const OverlayGrid: Component<OverlayGridProps> = (props) => (
  <div
    class='overlay-grid'
    data-overlay-grid
    data-guides={props.guides === true ? '' : undef}
    style={{
      '--overlay-columns': props.layout.columns,
      '--overlay-rows': props.layout.rows,
    }}
  >
    <For each={props.layout.widgets}>
      {(widget) => (
        <Show when={getOverlayWidgetDefinition(widget.type)}>
          {(definition) => {
            const content = (
              <WidgetContent widget={widget} anchor={widget.anchor}>
                <Dynamic component={definition().Render} widget={widget} />
              </WidgetContent>
            );
            return (
              <div class='overlay-cell' data-widget-id={widget.id} style={overlayGridArea(widget)}>
                {props.renderWidget ? props.renderWidget(widget, content) : content}
              </div>
            );
          }}
        </Show>
      )}
    </For>
  </div>
);

export { OverlayGrid };

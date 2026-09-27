import type { Component, JSXElement } from 'solid-js';

import type { OverlayAnchor, OverlayWidget } from '@/stores/overlayTypes';

import { getWidgetSizes } from '@/stores/overlayWidgetSizes';

export const WIDGET_CELL_SIZE = 24;
export const WIDGET_GUTTER = 4;
const HALF = 0.5;
const PERCENT = 100;
const ANCHORS: Record<OverlayAnchor, readonly [number, number]> = {
  topLeft: [0, 0],
  top: [HALF, 0],
  topRight: [1, 0],
  left: [0, HALF],
  center: [HALF, HALF],
  right: [1, HALF],
  bottomLeft: [0, 1],
  bottom: [HALF, 1],
  bottomRight: [1, 1],
};

type WidgetContentProps = {
  children: JSXElement;
  widget: Pick<OverlayWidget, 'type' | 'columnSpan' | 'rowSpan'>;
  anchor: OverlayAnchor;
  preview?: boolean;
};

/** Larger readings enlarge their contents as well as their surface. */
const readingMagnification = (widget: WidgetContentProps['widget']): number => {
  const [base] = getWidgetSizes(widget.type);
  if (!base || base.rows !== 1) {
    return 1;
  }
  return Math.min(widget.columnSpan / base.columns, widget.rowSpan / base.rows);
};

/** Every instrument uses the same reference cell, typography and gutter. */
const WidgetContent: Component<WidgetContentProps> = (props) => {
  const [slot, setSlot] = createSignal<HTMLDivElement>();
  const [size, setSize] = createSignal({ width: 0, height: 0 });
  const width = (): number =>
    (props.widget.columnSpan * WIDGET_CELL_SIZE - WIDGET_GUTTER) /
    readingMagnification(props.widget);
  const height = (): number =>
    (props.widget.rowSpan * WIDGET_CELL_SIZE - WIDGET_GUTTER) / readingMagnification(props.widget);

  createEffect(() => {
    const outer = slot();
    if (!outer) {
      return;
    }
    const measure = (): void => {
      const { width: slotWidth, height: slotHeight } = outer.getBoundingClientRect();
      setSize({ width: slotWidth, height: slotHeight });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    measure();
    onCleanup(() => {
      observer.disconnect();
    });
  });

  const position = (): Record<string, string> => {
    const [horizontal, vertical] = ANCHORS[props.anchor];
    const scale = Math.min(
      size().width / width(),
      size().height / height(),
      props.preview === true ? 1 : Number.POSITIVE_INFINITY,
    );
    return {
      width: `${width()}px`,
      height: `${height()}px`,
      left: `calc(${horizontal * PERCENT}% - ${horizontal * width() * scale}px)`,
      top: `calc(${vertical * PERCENT}% - ${vertical * height() * scale}px)`,
      transform: `scale(${scale})`,
    };
  };

  return (
    <div ref={setSlot} class='relative h-full w-full' data-widget-content>
      <div class='absolute origin-top-left' style={position()}>
        {props.children}
      </div>
    </div>
  );
};

export { WidgetContent };

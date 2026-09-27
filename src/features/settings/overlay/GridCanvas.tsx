import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import RestartAltIcon from '~icons/material-symbols/restart-alt';

import type { OverlayLayout } from '@/stores/overlayTypes';

import { OverlayGrid } from '@/features/overlay/OverlayGrid';
import { OverlayPreviewProvider } from '@/features/overlay/OverlayPreview';
import { VideoStream } from '@/features/videoStream';
import { CameraFrame } from '@/features/videoStream/CameraFrame';
import * as m from '@/paraglide/messages';

import type { GridCell } from './placement';

import { createDragController } from './dragController';
import { DraggableWidget } from './DraggableWidget';

const [undef] = [] as undefined[];

type GridCanvasProps = {
  layout: OverlayLayout;
  selectedId: string | undefined;
  onSelect: (widgetId: string | undefined) => void;
  onMove: (widgetId: string, cell: GridCell) => void;
  onDrop: () => void;
  onRemove: (widgetId: string) => void;
  onReset: () => void;
};

const DeselectCanvasButton: Component<{ onSelect: GridCanvasProps['onSelect'] }> = (props) => (
  <button
    type='button'
    aria-label={m.overlay_layout_canvas_label()}
    class='absolute inset-0 cursor-default'
    onClick={() => {
      props.onSelect(undef);
    }}
  />
);

const CanvasFooter: Component<{ onReset: () => void }> = (props) => (
  <div class='mt-2 flex flex-wrap items-center justify-between gap-2'>
    <p class='text-xs text-muted-foreground'>{m.overlay_layout_keyboard_hint()}</p>
    <Button type='button' variant='outline' size='sm' class='gap-2' onClick={props.onReset}>
      <RestartAltIcon class='size-4' />
      {m.overlay_layout_reset()}
    </Button>
  </div>
);

const GridCanvas: Component<GridCanvasProps> = (props) => {
  const [canvas, setCanvas] = createSignal<HTMLElement>();
  const drag = createDragController({
    canvas,
    grid: () => ({ columns: props.layout.columns, rows: props.layout.rows }),
    onSelect: props.onSelect,
    onMove: props.onMove,
    onDrop: props.onDrop,
  });

  return (
    <section class='min-w-0' aria-label={m.overlay_layout_camera()}>
      <CameraFrame class='w-full rounded-sm'>
        <VideoStream preview />
        <div
          ref={setCanvas}
          data-overlay-canvas
          class='absolute inset-0'
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          onPointerCancel={drag.onPointerUp}
        >
          <DeselectCanvasButton onSelect={props.onSelect} />
          <OverlayPreviewProvider>
            <div class='pointer-events-none absolute inset-0'>
              <OverlayGrid
                layout={props.layout}
                guides
                renderWidget={(widget, content) => (
                  <DraggableWidget
                    widget={widget}
                    selected={props.selectedId === widget.id}
                    content={content}
                    onPointerDown={drag.onWidgetPointerDown}
                    onSelect={props.onSelect}
                    onRemove={props.onRemove}
                  />
                )}
              />
            </div>
          </OverlayPreviewProvider>
        </div>
      </CameraFrame>
      <CanvasFooter onReset={props.onReset} />
    </section>
  );
};

export { GridCanvas };

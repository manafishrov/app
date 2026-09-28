import type { Component } from 'solid-js';

import type { GridCell } from '@/stores/overlayLayout';

import * as m from '@/paraglide/messages';

import { GridCanvas } from './GridCanvas';
import { createLayoutDraft, type LayoutDraft } from './layoutDraft';
import { WidgetInspector } from './WidgetInspector';
import { WidgetPalette } from './WidgetPalette';

const [undef] = [] as undefined[];

const ARROW_KEYS: Record<string, GridCell> = {
  ArrowLeft: { column: -1, row: 0 },
  ArrowRight: { column: 1, row: 0 },
  ArrowUp: { column: 0, row: -1 },
  ArrowDown: { column: 0, row: 1 },
};

const SelectionControls: Component<{ draft: LayoutDraft }> = (props) => (
  <div class='flex min-h-32 items-start rounded-md border border-border/60 px-3 py-2 sm:min-h-24'>
    <Show
      when={props.draft.selectedWidget()}
      fallback={<p class='text-xs text-muted-foreground'>{m.overlay_layout_no_selection()}</p>}
    >
      {(widget) => (
        <WidgetInspector
          widget={widget()}
          onSpanChange={props.draft.resizeSelected}
          onRemove={props.draft.removeSelected}
          onOptionsChange={(options) => {
            props.draft.patchSelected({ options });
          }}
        />
      )}
    </Show>
  </div>
);

const handleEditorKey = (event: KeyboardEvent, draft: LayoutDraft): void => {
  if (!(event.target instanceof HTMLElement) || !event.target.closest('[data-overlay-canvas]')) {
    return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    draft.removeSelected();
  } else {
    const delta = ARROW_KEYS[event.key];
    if (delta === undef || draft.selectedWidget() === undef) {
      return;
    }

    event.preventDefault();
    draft.nudgeSelected(delta);
  }
};

/** Arranges overlay widgets on a grid that mirrors the camera feed. */
const OverlayLayoutEditor: Component = () => {
  const draft = createLayoutDraft();

  return (
    <div
      class='flex flex-col gap-6'
      onKeyDown={(event) => {
        handleEditorKey(event, draft);
      }}
    >
      <div class='mx-auto flex w-full max-w-3xl flex-col gap-2'>
        <div class='min-w-0'>
          <GridCanvas
            layout={draft.layout}
            selectedId={draft.selectedId()}
            onSelect={draft.setSelectedId}
            onMove={draft.moveTo}
            onDrop={draft.commit}
            onRemove={draft.remove}
            onReset={draft.reset}
          />
        </div>

        <SelectionControls draft={draft} />
      </div>
      <WidgetPalette onAdd={draft.add} />
    </div>
  );
};

export { OverlayLayoutEditor };

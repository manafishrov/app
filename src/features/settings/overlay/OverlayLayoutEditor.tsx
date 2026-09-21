import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import RestartAltIcon from '~icons/material-symbols/restart-alt';

import type { GridCell } from '@/stores/overlayLayout';

import * as m from '@/paraglide/messages';

import { EditorSidebar } from './EditorSidebar';
import { GridCanvas } from './GridCanvas';
import { createLayoutDraft } from './layoutDraft';

const [undef] = [] as undefined[];

const ARROW_KEYS: Record<string, GridCell> = {
  ArrowLeft: { column: -1, row: 0 },
  ArrowRight: { column: 1, row: 0 },
  ArrowUp: { column: 0, row: -1 },
  ArrowDown: { column: 0, row: 1 },
};

const EditorHeader: Component<{ onReset: () => void }> = (props) => (
  <div class='flex items-start justify-between gap-4'>
    <div class='flex flex-col gap-1'>
      <span class='text-sm font-medium'>{m.overlay_layout_title()}</span>
      <span class='text-xs text-muted-foreground'>{m.overlay_layout_description()}</span>
    </div>
    <Button type='button' variant='outline' size='sm' class='gap-2' onClick={props.onReset}>
      <RestartAltIcon class='size-4' />
      {m.overlay_layout_reset()}
    </Button>
  </div>
);

/** Arranges overlay widgets on a grid that mirrors the camera feed. */
const OverlayLayoutEditor: Component = () => {
  const draft = createLayoutDraft();

  const handleKeyDown = (event: KeyboardEvent): void => {
    const delta = ARROW_KEYS[event.key];
    if (delta === undef || draft.selectedWidget() === undef) {
      return;
    }

    event.preventDefault();
    draft.nudgeSelected(delta);
  };

  return (
    <div class='flex flex-col gap-3' onKeyDown={handleKeyDown}>
      <EditorHeader onReset={draft.reset} />

      <div class='flex flex-col gap-4 lg:flex-row'>
        <div class='min-w-0 flex-1'>
          <GridCanvas
            layout={draft.layout}
            selectedId={draft.selectedId()}
            onSelect={draft.setSelectedId}
            onMove={draft.moveTo}
            onDrop={draft.commit}
          />
        </div>

        <EditorSidebar
          selected={draft.selectedWidget()}
          limits={{ maxColumnSpan: draft.layout.columns, maxRowSpan: draft.layout.rows }}
          onAdd={draft.add}
          onAnchorChange={(anchor) => {
            draft.patchSelected({ anchor });
          }}
          onOptionsChange={(options) => {
            draft.patchSelected({ options });
          }}
          onSpanChange={draft.resizeSelected}
          onRemove={draft.removeSelected}
        />
      </div>
    </div>
  );
};

export { OverlayLayoutEditor };

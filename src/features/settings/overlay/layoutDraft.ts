import type { Accessor, Setter } from 'solid-js';

import { createStore, reconcile, unwrap } from 'solid-js/store';

import type { OverlayLayout, OverlayWidget, OverlayWidgetType } from '@/stores/overlayTypes';

import { getOverlayWidgetDefinition } from '@/features/overlay/widgets/Registry';
import { logError } from '@/lib/log';
import { configStore, setConfig } from '@/stores/config';
import { createDefaultOverlayLayout } from '@/stores/overlayDefaults';
import {
  addWidget,
  createWidgetId,
  findFreeCell,
  getActiveLayout,
  moveWidget,
  normaliseLayout,
  removeWidget,
  replaceLayout,
  resizeWidget,
  updateWidget,
  type GridCell,
  type GridSpan,
} from '@/stores/overlayLayout';

const [undef] = [] as undefined[];

const persist = (layout: OverlayLayout): void => {
  setConfig({ overlay: replaceLayout(configStore.overlay, layout) }).catch((error: unknown) => {
    logError('Failed to save overlay layout:', error);
  });
};

/** Builds a new widget of this type on the first free cell it fits. */
const buildWidget = (layout: OverlayLayout, type: OverlayWidgetType): OverlayWidget | undefined => {
  const definition = getOverlayWidgetDefinition(type);
  if (definition === undef) {
    return undef;
  }

  const span = {
    columnSpan: definition.defaultColumnSpan,
    rowSpan: definition.defaultRowSpan,
  };

  return {
    id: createWidgetId(type, layout),
    type,
    ...findFreeCell(layout, span),
    ...span,
    anchor: definition.defaultAnchor,
    options: { ...definition.defaultOptions },
  };
};

type DraftContext = {
  current: () => OverlayLayout;
  apply: (next: OverlayLayout, commit: boolean) => void;
  selectedWidget: Accessor<OverlayWidget | undefined>;
  setSelectedId: Setter<string | undefined>;
};

export type LayoutDraft = {
  layout: OverlayLayout;
  selectedId: Accessor<string | undefined>;
  setSelectedId: Setter<string | undefined>;
  selectedWidget: Accessor<OverlayWidget | undefined>;
  /** Drag-time update; not written to disk until `commit`. */
  moveTo: (widgetId: string, cell: GridCell) => void;
  commit: () => void;
  add: (type: OverlayWidgetType) => void;
  patchSelected: (patch: Partial<Omit<OverlayWidget, 'id' | 'type'>>) => void;
  resizeSelected: (span: GridSpan) => void;
  removeSelected: () => void;
  remove: (widgetId: string) => void;
  nudgeSelected: (delta: GridCell) => void;
  reset: () => void;
};

type DraftOperations = Omit<
  LayoutDraft,
  'layout' | 'selectedId' | 'setSelectedId' | 'selectedWidget'
>;

/** Applies a transform to the selected widget, if there is one. */
const editSelected =
  (context: DraftContext) =>
  (transform: (widget: OverlayWidget) => OverlayLayout): void => {
    const widget = context.selectedWidget();
    if (widget !== undef) {
      context.apply(transform(widget), true);
    }
  };

type PlacementOperations = Pick<DraftOperations, 'moveTo' | 'commit' | 'add' | 'reset'>;
type SelectionOperations = Omit<DraftOperations, keyof PlacementOperations>;

const createPlacementOperations = (context: DraftContext): PlacementOperations => {
  const { current, apply } = context;

  return {
    moveTo: (widgetId, cell) => {
      apply(moveWidget(current(), widgetId, cell), false);
    },

    commit: () => {
      persist(current());
    },

    add: (type) => {
      const widget = buildWidget(current(), type);
      if (widget === undef) {
        return;
      }
      apply(addWidget(current(), widget), true);
      context.setSelectedId(widget.id);
    },

    reset: () => {
      const layout = current();
      apply({ ...createDefaultOverlayLayout(layout.name), id: layout.id }, true);
      context.setSelectedId(undef);
    },
  };
};

const createSelectionOperations = (context: DraftContext): SelectionOperations => {
  const { current } = context;
  const edit = editSelected(context);

  return {
    patchSelected: (patch) => {
      edit((widget) => updateWidget(current(), widget.id, patch));
    },

    resizeSelected: (span) => {
      edit((widget) => resizeWidget(current(), widget.id, span));
    },

    remove: (widgetId) => {
      context.apply(removeWidget(current(), widgetId), true);
      context.setSelectedId(undef);
    },

    removeSelected: () => {
      edit((widget) => removeWidget(current(), widget.id));
      context.setSelectedId(undef);
    },

    nudgeSelected: (delta) => {
      edit((widget) =>
        moveWidget(current(), widget.id, {
          column: widget.column + delta.column,
          row: widget.row + delta.row,
        }),
      );
    },
  };
};

/**
 * Editable copy of the stored overlay layout.
 *
 * Mutations land on the draft first and are persisted on commit, so a drag does
 * not write to disk on every pointer move.
 */
export const createLayoutDraft = (): LayoutDraft => {
  const [draft, setDraft] = createStore<{ layout: OverlayLayout }>({
    layout: createDefaultOverlayLayout(''),
  });
  const [selectedId, setSelectedId] = createSignal<string>();

  createEffect(() => {
    const active = getActiveLayout(configStore.overlay);
    if (active !== undef) {
      setDraft('layout', reconcile(normaliseLayout(active)));
    }
  });

  const selectedWidget = createMemo(() => {
    const id = selectedId();
    return id === undef ? undef : draft.layout.widgets.find((widget) => widget.id === id);
  });

  const context: DraftContext = {
    current: () => unwrap(draft.layout),
    apply: (next, commit) => {
      setDraft('layout', reconcile(next));
      if (commit) {
        persist(next);
      }
    },
    selectedWidget,
    setSelectedId,
  };

  return {
    get layout() {
      return draft.layout;
    },
    selectedId,
    setSelectedId,
    selectedWidget,
    ...createPlacementOperations(context),
    ...createSelectionOperations(context),
  };
};

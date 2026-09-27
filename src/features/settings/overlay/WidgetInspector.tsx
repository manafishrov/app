import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import DeleteIcon from '~icons/material-symbols/delete';

import type { WidgetFootprint } from '@/features/overlay/widgets/definitions';
import type { GridSpan } from '@/stores/overlayLayout';
import type { OverlayWidget } from '@/stores/overlayTypes';

import { getOverlayWidgetDefinition } from '@/features/overlay/widgets/Registry';
import * as m from '@/paraglide/messages';

const [undef] = [] as undefined[];

type WidgetInspectorProps = {
  widget: OverlayWidget;
  onSpanChange: (span: GridSpan) => void;
  onRemove: () => void;
};

const RemoveWidgetButton: Component<{ onRemove: () => void }> = (props) => (
  <Button
    type='button'
    variant='ghost'
    size='sm'
    class='shrink-0'
    title={m.overlay_layout_remove_widget()}
    aria-label={m.overlay_layout_remove_widget()}
    onClick={props.onRemove}
  >
    <DeleteIcon class='size-4' />
    <span class='hidden sm:inline'>{m.overlay_layout_remove_widget()}</span>
  </Button>
);

const WidgetSizes: Component<{
  widget: OverlayWidget;
  sizes: readonly WidgetFootprint[];
  onSpanChange: (span: GridSpan) => void;
}> = (props) => (
  <div class='flex flex-wrap gap-1.5' role='group' aria-label={m.overlay_layout_size_title()}>
    <For each={props.sizes}>
      {(size) => (
        <Button
          type='button'
          size='sm'
          variant={
            props.widget.columnSpan === size.columns && props.widget.rowSpan === size.rows
              ? 'default'
              : 'outline'
          }
          aria-pressed={
            props.widget.columnSpan === size.columns && props.widget.rowSpan === size.rows
          }
          onClick={() => {
            props.onSpanChange({ columnSpan: size.columns, rowSpan: size.rows });
          }}
        >
          {size.columns} × {size.rows}
        </Button>
      )}
    </For>
  </div>
);

const WidgetInspector: Component<WidgetInspectorProps> = (props) => {
  const definition = createMemo(() => getOverlayWidgetDefinition(props.widget.type));

  const label = (): string => {
    const found = definition();
    return found === undef ? props.widget.type : found.label();
  };
  const sizes = (): readonly WidgetFootprint[] => {
    const found = definition();
    /* oxlint-disable unicorn/no-array-sort -- ES2022; sort a fresh copy. */
    return found === undef
      ? []
      : [...found.sizes].sort((left, right) => left.columns - right.columns);
    /* oxlint-enable unicorn/no-array-sort */
  };

  return (
    <section class='flex w-full flex-col gap-2' aria-label={label()}>
      <div class='flex min-h-8 items-center justify-between gap-3'>
        <span class='text-sm font-medium'>{label()}</span>
        <RemoveWidgetButton onRemove={props.onRemove} />
      </div>

      <Show when={sizes().length > 1}>
        <WidgetSizes widget={props.widget} sizes={sizes()} onSpanChange={props.onSpanChange} />
      </Show>
    </section>
  );
};

export { WidgetInspector };

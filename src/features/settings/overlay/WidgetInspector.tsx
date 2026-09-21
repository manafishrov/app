import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import {
  Switch as SwitchRoot,
  SwitchControl,
  SwitchLabel,
  SwitchThumb,
} from '@manafishrov/ui/switch';
import DeleteIcon from '~icons/material-symbols/delete';

import {
  getOverlayWidgetDefinition,
  OverlayWidgetOption,
  type OverlayWidgetDefinition,
} from '@/features/overlay/widgets/Registry';
import * as m from '@/paraglide/messages';
import {
  OverlayAnchor,
  type OverlayWidget,
  type OverlayWidgetOptions,
} from '@/stores/overlayTypes';

const MIN_SPAN = 1;

const [undef] = [] as undefined[];

const anchorOrder: readonly OverlayAnchor[] = [
  OverlayAnchor.topLeft,
  OverlayAnchor.top,
  OverlayAnchor.topRight,
  OverlayAnchor.left,
  OverlayAnchor.center,
  OverlayAnchor.right,
  OverlayAnchor.bottomLeft,
  OverlayAnchor.bottom,
  OverlayAnchor.bottomRight,
];

const anchorLabel = (anchor: OverlayAnchor): string => {
  const labels: Record<OverlayAnchor, string> = {
    topLeft: m.overlay_layout_anchor_top_left(),
    top: m.overlay_layout_anchor_top(),
    topRight: m.overlay_layout_anchor_top_right(),
    left: m.overlay_layout_anchor_left(),
    center: m.overlay_layout_anchor_center(),
    right: m.overlay_layout_anchor_right(),
    bottomLeft: m.overlay_layout_anchor_bottom_left(),
    bottom: m.overlay_layout_anchor_bottom(),
    bottomRight: m.overlay_layout_anchor_bottom_right(),
  };
  return labels[anchor];
};

type SpanLimits = { maxColumnSpan: number; maxRowSpan: number };

type WidgetInspectorProps = {
  widget: OverlayWidget;
  limits: SpanLimits;
  onAnchorChange: (anchor: OverlayAnchor) => void;
  onSpanChange: (span: { columnSpan: number; rowSpan: number }) => void;
  onOptionsChange: (options: OverlayWidgetOptions) => void;
  onRemove: () => void;
};

const SpanStepper: Component<{
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}> = (props) => (
  <div class='flex items-center justify-between gap-2'>
    <span class='text-xs text-muted-foreground'>{props.label}</span>
    <div class='flex items-center gap-1'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        aria-label={`${props.label} −`}
        disabled={props.value <= MIN_SPAN}
        onClick={() => {
          props.onChange(props.value - 1);
        }}
      >
        −
      </Button>
      <span class='w-6 text-center font-mono text-sm tabular-nums'>{props.value}</span>
      <Button
        type='button'
        variant='outline'
        size='sm'
        aria-label={`${props.label} +`}
        disabled={props.value >= props.max}
        onClick={() => {
          props.onChange(props.value + 1);
        }}
      >
        +
      </Button>
    </div>
  </div>
);

const AnchorPicker: Component<{
  anchor: OverlayAnchor;
  onChange: (anchor: OverlayAnchor) => void;
}> = (props) => (
  <div class='flex flex-col gap-2'>
    <span class='text-xs text-muted-foreground'>{m.overlay_layout_anchor_title()}</span>
    <div class='grid grid-cols-3 gap-1'>
      <For each={anchorOrder}>
        {(anchor) => (
          <Button
            type='button'
            variant={props.anchor === anchor ? 'default' : 'outline'}
            size='sm'
            aria-label={anchorLabel(anchor)}
            aria-pressed={props.anchor === anchor}
            onClick={() => {
              props.onChange(anchor);
            }}
          >
            <span class='size-1.5 rounded-full bg-current' />
          </Button>
        )}
      </For>
    </div>
  </div>
);

const SizeFields: Component<{
  widget: OverlayWidget;
  limits: SpanLimits;
  onSpanChange: (span: { columnSpan: number; rowSpan: number }) => void;
}> = (props) => (
  <div class='flex flex-col gap-2'>
    <span class='text-xs text-muted-foreground'>{m.overlay_layout_size_title()}</span>
    <SpanStepper
      label={m.overlay_layout_size_columns()}
      value={props.widget.columnSpan}
      max={props.limits.maxColumnSpan}
      onChange={(columnSpan) => {
        props.onSpanChange({ columnSpan, rowSpan: props.widget.rowSpan });
      }}
    />
    <SpanStepper
      label={m.overlay_layout_size_rows()}
      value={props.widget.rowSpan}
      max={props.limits.maxRowSpan}
      onChange={(rowSpan) => {
        props.onSpanChange({ columnSpan: props.widget.columnSpan, rowSpan });
      }}
    />
  </div>
);

const InspectorHeader: Component<{
  definition: OverlayWidgetDefinition | undefined;
  fallbackLabel: string;
  onRemove: () => void;
}> = (props) => (
  <div class='flex items-center justify-between gap-2'>
    <span class='truncate text-sm font-medium'>
      {props.definition ? props.definition.label() : props.fallbackLabel}
    </span>
    <Button
      type='button'
      variant='ghost'
      size='sm'
      aria-label={m.overlay_layout_remove_widget()}
      onClick={props.onRemove}
    >
      <DeleteIcon class='size-4' />
    </Button>
  </div>
);

/** Settings for the widget currently selected on the canvas. */
const WidgetInspector: Component<WidgetInspectorProps> = (props) => {
  const definition = createMemo(() => getOverlayWidgetDefinition(props.widget.type));

  const isResizable = createMemo(() => {
    const resolved = definition();
    return resolved !== undef && resolved.resizable;
  });

  const hasWorkIndicator = createMemo(() => {
    const resolved = definition();
    return resolved !== undef && resolved.options.includes(OverlayWidgetOption.workIndicator);
  });

  return (
    <div class='flex flex-col gap-4'>
      <InspectorHeader
        definition={definition()}
        fallbackLabel={props.widget.type}
        onRemove={props.onRemove}
      />

      <AnchorPicker anchor={props.widget.anchor} onChange={props.onAnchorChange} />

      <Show when={isResizable()}>
        <SizeFields widget={props.widget} limits={props.limits} onSpanChange={props.onSpanChange} />
      </Show>

      <Show when={hasWorkIndicator()}>
        <SwitchRoot
          size='sm'
          checked={props.widget.options.workIndicator === true}
          onCheckedChange={(details) => {
            props.onOptionsChange({ ...props.widget.options, workIndicator: details.checked });
          }}
        >
          <SwitchControl>
            <SwitchThumb />
          </SwitchControl>
          <SwitchLabel class='text-xs'>{m.overlay_layout_option_work_indicator()}</SwitchLabel>
        </SwitchRoot>
      </Show>
    </div>
  );
};

export { WidgetInspector };

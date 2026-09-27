import {
  OVERLAY_GRID_COLUMNS,
  OVERLAY_GRID_ROWS,
  OverlayWidgetType,
  type OverlayWidget,
} from './overlayTypes';
import { getWidgetSizes } from './overlayWidgetSizes';

const PAIR = 2;
const [undef] = [] as undefined[];
const LEGACY_GROUPS = new Map<string, readonly [OverlayWidgetType, OverlayWidgetType]>([
  ['stabilization', [OverlayWidgetType.autoStabilization, OverlayWidgetType.depthHold]],
  ['depth', [OverlayWidgetType.currentDepth, OverlayWidgetType.desiredDepth]],
  ['temperature', [OverlayWidgetType.waterTemperature, OverlayWidgetType.electronicsTemperature]],
  ['battery', [OverlayWidgetType.currentDraw, OverlayWidgetType.batteryLevel]],
]);

/** Keep fixed controls compact, and restrict instruments to their supported sizes. */
export const fitWidgetSize = (widget: OverlayWidget): OverlayWidget => {
  const sizes = getWidgetSizes(widget.type);
  const [first] = sizes;
  if (first === undef) {
    return widget;
  }
  let closest = first;
  for (const size of sizes) {
    if (
      Math.abs(size.columns - widget.columnSpan) < Math.abs(closest.columns - widget.columnSpan)
    ) {
      closest = size;
    }
  }
  return { ...widget, columnSpan: closest.columns, rowSpan: closest.rows };
};

const uniqueId = (base: string, taken: Set<string>): string => {
  let id = base;
  let suffix = PAIR;
  while (taken.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  taken.add(id);
  return id;
};

const alignSplitPair = (first: OverlayWidget, second: OverlayWidget, horizontal: boolean): void => {
  if (horizontal) {
    first.column = Math.min(
      first.column,
      OVERLAY_GRID_COLUMNS - first.columnSpan - second.columnSpan + 1,
    );
    second.column = first.column + first.columnSpan;
  } else {
    first.row = Math.min(first.row, OVERLAY_GRID_ROWS - first.rowSpan - second.rowSpan + 1);
    second.row = first.row + first.rowSpan;
  }
};

const THRUSTER_TYPES = [
  OverlayWidgetType.thrusterRpm1,
  OverlayWidgetType.thrusterRpm2,
  OverlayWidgetType.thrusterRpm3,
  OverlayWidgetType.thrusterRpm4,
  OverlayWidgetType.thrusterRpm5,
  OverlayWidgetType.thrusterRpm6,
  OverlayWidgetType.thrusterRpm7,
  OverlayWidgetType.thrusterRpm8,
] as const;

const splitThrusters = (widget: OverlayWidget, taken: Set<string>): OverlayWidget[] =>
  THRUSTER_TYPES.map((type, index) =>
    fitWidgetSize({
      ...widget,
      type,
      id: index === 0 ? widget.id : uniqueId(`${widget.id}-${type}`, taken),
      row: Math.min(widget.row, OVERLAY_GRID_ROWS - THRUSTER_TYPES.length + 1) + index,
    }),
  );

const splitWorkIndicator = (widget: OverlayWidget, taken: Set<string>): OverlayWidget[] => {
  const enabled = widget.options.workIndicator === true;
  const options = { ...widget.options };
  delete options.workIndicator;
  const instrument = { ...widget, options };
  if (!enabled) {
    return [instrument];
  }
  const work = fitWidgetSize({
    ...instrument,
    type: OverlayWidgetType.workIndicator,
    id: uniqueId(`${widget.id}-workIndicator`, taken),
    row: widget.row > 1 ? widget.row - 1 : widget.row + widget.rowSpan,
  });
  return [instrument, work];
};

/** Split saved groups once, keeping the original id and approximate placement. */
export const splitLegacyWidgets = (widgets: OverlayWidget[]): OverlayWidget[] => {
  const taken = new Set(widgets.map((widget) => widget.id));
  const split = widgets.flatMap((widget) => {
    if (widget.type === 'thrusterRpm') {
      return splitThrusters(widget, taken);
    }
    const pair = LEGACY_GROUPS.get(widget.type);
    if (pair === undef) {
      return [fitWidgetSize(widget)];
    }
    const first = fitWidgetSize({ ...widget, type: pair[0] });
    const second = fitWidgetSize({
      ...widget,
      id: uniqueId(`${widget.id}-${pair[1]}`, taken),
      type: pair[1],
    });
    alignSplitPair(first, second, widget.type === 'stabilization');
    return [first, second];
  });
  return split.flatMap((widget) => splitWorkIndicator(widget, taken));
};

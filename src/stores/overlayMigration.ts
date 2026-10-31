import {
  OVERLAY_GRID_COLUMNS,
  OVERLAY_GRID_ROWS,
  OverlayWidgetType,
  type OverlayWidget,
} from './overlayTypes';
import { getWidgetSizes, type WidgetFootprint } from './overlayWidgetSizes';

const PAIR = 2;
const [undef] = [] as undefined[];
const LEGACY_GROUPS = new Map<string, readonly [OverlayWidgetType, OverlayWidgetType]>([
  ['stabilization', [OverlayWidgetType.autoStabilization, OverlayWidgetType.depthHold]],
  ['depth', [OverlayWidgetType.currentDepth, OverlayWidgetType.desiredDepth]],
  ['temperature', [OverlayWidgetType.waterTemperature, OverlayWidgetType.electronicsTemperature]],
  ['battery', [OverlayWidgetType.currentDraw, OverlayWidgetType.batteryLevel]],
]);

const sizeDistance = (widget: OverlayWidget, size: WidgetFootprint): number =>
  Math.abs(size.columns - widget.columnSpan) + Math.abs(size.rows - widget.rowSpan);

/**
 * Restrict a widget to its supported sizes, preferring the smallest on a tie so
 * fixed controls stay compact.
 */
export const fitWidgetSize = (widget: OverlayWidget): OverlayWidget => {
  const sizes = getWidgetSizes(widget);
  const [first] = sizes;
  if (
    first === undef ||
    sizes.some((size) => size.columns === widget.columnSpan && size.rows === widget.rowSpan)
  ) {
    return widget;
  }
  let closest = first;
  for (const size of sizes) {
    if (sizeDistance(widget, size) < sizeDistance(widget, closest)) {
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
  THRUSTER_TYPES.map((type, index) => {
    const channel = fitWidgetSize({
      ...widget,
      type,
      id: index === 0 ? widget.id : uniqueId(`${widget.id}-${type}`, taken),
    });
    const stackRows = THRUSTER_TYPES.length * channel.rowSpan;
    channel.row = Math.min(widget.row, OVERLAY_GRID_ROWS - stackRows + 1) + index * channel.rowSpan;
    return channel;
  });

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
  });
  work.row = widget.row > work.rowSpan ? widget.row - work.rowSpan : widget.row + widget.rowSpan;
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

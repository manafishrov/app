import {
  OVERLAY_GRID_COLUMNS,
  OVERLAY_GRID_ROWS,
  OverlayAnchor,
  OverlayWidgetType,
  type OverlayConfig,
  type OverlayLayout,
  type OverlayWidget,
} from '@/stores/overlayTypes';

export const DEFAULT_OVERLAY_LAYOUT_ID = 'default';

type DefaultPlacement = [
  id: string,
  type: OverlayWidgetType,
  column: number,
  row: number,
  columnSpan: number,
  rowSpan: number,
  anchor: OverlayAnchor,
];

/* oxlint-disable no-magic-numbers -- grid coordinates are the data itself */
/**
 * Instruments sit around the edge, leaving the camera centre clear.
 *
 * Mirrored in `src-tauri/src/models/config.rs`; keep the two in step.
 */
const DEFAULT_PLACEMENTS: readonly DefaultPlacement[] = [
  ['connection-status', OverlayWidgetType.connectionStatus, 1, 1, 4, 1, OverlayAnchor.topRight],
  ['recording', OverlayWidgetType.recording, 5, 1, 4, 1, OverlayAnchor.topRight],
  ['stabilization', OverlayWidgetType.autoStabilization, 1, 11, 2, 2, OverlayAnchor.left],
  ['depth-hold', OverlayWidgetType.depthHold, 1, 13, 2, 2, OverlayAnchor.left],
  ['attitude', OverlayWidgetType.attitudeScientific, 1, 18, 7, 7, OverlayAnchor.bottomLeft],
  ['thruster-rpm-1', OverlayWidgetType.thrusterRpm1, 28, 9, 5, 1, OverlayAnchor.bottomRight],
  ['thruster-rpm-2', OverlayWidgetType.thrusterRpm2, 28, 10, 5, 1, OverlayAnchor.bottomRight],
  ['thruster-rpm-3', OverlayWidgetType.thrusterRpm3, 28, 11, 5, 1, OverlayAnchor.bottomRight],
  ['thruster-rpm-4', OverlayWidgetType.thrusterRpm4, 28, 12, 5, 1, OverlayAnchor.bottomRight],
  ['thruster-rpm-5', OverlayWidgetType.thrusterRpm5, 28, 13, 5, 1, OverlayAnchor.bottomRight],
  ['thruster-rpm-6', OverlayWidgetType.thrusterRpm6, 28, 14, 5, 1, OverlayAnchor.bottomRight],
  ['thruster-rpm-7', OverlayWidgetType.thrusterRpm7, 28, 15, 5, 1, OverlayAnchor.bottomRight],
  ['thruster-rpm-8', OverlayWidgetType.thrusterRpm8, 28, 16, 5, 1, OverlayAnchor.bottomRight],
  ['depth', OverlayWidgetType.currentDepth, 18, 24, 5, 1, OverlayAnchor.topLeft],
  ['target-depth', OverlayWidgetType.desiredDepth, 18, 23, 5, 1, OverlayAnchor.topLeft],
  ['water-temperature', OverlayWidgetType.waterTemperature, 23, 23, 5, 1, OverlayAnchor.right],
  [
    'electronics-temperature',
    OverlayWidgetType.electronicsTemperature,
    23,
    24,
    5,
    1,
    OverlayAnchor.right,
  ],
  ['current-draw', OverlayWidgetType.currentDraw, 28, 23, 5, 1, OverlayAnchor.right],
  ['battery', OverlayWidgetType.batteryLevel, 28, 24, 5, 1, OverlayAnchor.right],
  ['work', OverlayWidgetType.workIndicator, 1, 17, 4, 1, OverlayAnchor.right],
];
/* oxlint-enable no-magic-numbers */

const toWidget = ([
  id,
  type,
  column,
  row,
  columnSpan,
  rowSpan,
  anchor,
]: DefaultPlacement): OverlayWidget => ({
  id,
  type,
  column,
  row,
  columnSpan,
  rowSpan,
  anchor,
  options: {},
});

export const createDefaultOverlayLayout = (name: string): OverlayLayout => ({
  id: DEFAULT_OVERLAY_LAYOUT_ID,
  name,
  columns: OVERLAY_GRID_COLUMNS,
  rows: OVERLAY_GRID_ROWS,
  widgets: DEFAULT_PLACEMENTS.map((placement) => toWidget(placement)),
});

export const createDefaultOverlayConfig = (name: string): OverlayConfig => ({
  activeLayoutId: DEFAULT_OVERLAY_LAYOUT_ID,
  layouts: [createDefaultOverlayLayout(name)],
});

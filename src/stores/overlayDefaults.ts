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
  ['connection-status', OverlayWidgetType.connectionStatus, 1, 1, 8, 2, OverlayAnchor.topRight],
  ['recording', OverlayWidgetType.recording, 9, 1, 8, 2, OverlayAnchor.topRight],
  ['stabilization', OverlayWidgetType.autoStabilization, 1, 22, 3, 3, OverlayAnchor.left],
  ['depth-hold', OverlayWidgetType.depthHold, 1, 25, 3, 3, OverlayAnchor.left],
  ['attitude', OverlayWidgetType.attitudeScientific, 1, 35, 14, 14, OverlayAnchor.bottomLeft],
  ['thruster-rpm-1', OverlayWidgetType.thrusterRpm1, 55, 17, 10, 2, OverlayAnchor.bottomRight],
  ['thruster-rpm-2', OverlayWidgetType.thrusterRpm2, 55, 19, 10, 2, OverlayAnchor.bottomRight],
  ['thruster-rpm-3', OverlayWidgetType.thrusterRpm3, 55, 21, 10, 2, OverlayAnchor.bottomRight],
  ['thruster-rpm-4', OverlayWidgetType.thrusterRpm4, 55, 23, 10, 2, OverlayAnchor.bottomRight],
  ['thruster-rpm-5', OverlayWidgetType.thrusterRpm5, 55, 25, 10, 2, OverlayAnchor.bottomRight],
  ['thruster-rpm-6', OverlayWidgetType.thrusterRpm6, 55, 27, 10, 2, OverlayAnchor.bottomRight],
  ['thruster-rpm-7', OverlayWidgetType.thrusterRpm7, 55, 29, 10, 2, OverlayAnchor.bottomRight],
  ['thruster-rpm-8', OverlayWidgetType.thrusterRpm8, 55, 31, 10, 2, OverlayAnchor.bottomRight],
  ['depth', OverlayWidgetType.currentDepth, 35, 47, 10, 2, OverlayAnchor.topLeft],
  ['target-depth', OverlayWidgetType.desiredDepth, 35, 45, 10, 2, OverlayAnchor.topLeft],
  ['water-temperature', OverlayWidgetType.waterTemperature, 45, 45, 10, 2, OverlayAnchor.right],
  [
    'electronics-temperature',
    OverlayWidgetType.electronicsTemperature,
    45,
    47,
    10,
    2,
    OverlayAnchor.right,
  ],
  ['current-draw', OverlayWidgetType.currentDraw, 55, 45, 10, 2, OverlayAnchor.right],
  ['battery', OverlayWidgetType.batteryLevel, 55, 47, 10, 2, OverlayAnchor.right],
  ['work', OverlayWidgetType.workIndicator, 1, 33, 8, 2, OverlayAnchor.right],
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

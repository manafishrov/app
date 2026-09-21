import {
  OVERLAY_GRID_COLUMNS,
  OVERLAY_GRID_ROWS,
  OverlayAnchor,
  OverlayWidgetType,
  type OverlayConfig,
  type OverlayLayout,
  type OverlayWidget,
  type OverlayWidgetOptions,
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
  options?: OverlayWidgetOptions,
];

/* oxlint-disable no-magic-numbers -- grid coordinates are the data itself */
/**
 * Reproduces the arrangement the overlay shipped with before it became
 * customisable, so existing users see no visual change on upgrade.
 *
 * Mirrored in `src-tauri/src/models/config.rs`; keep the two in step.
 */
const DEFAULT_PLACEMENTS: readonly DefaultPlacement[] = [
  ['connection-status', OverlayWidgetType.connectionStatus, 1, 1, 2, 1, OverlayAnchor.topLeft],
  ['recording', OverlayWidgetType.recording, 1, 2, 2, 1, OverlayAnchor.topLeft],
  ['stabilization', OverlayWidgetType.stabilization, 1, 5, 1, 1, OverlayAnchor.left],
  [
    'attitude',
    OverlayWidgetType.attitudeScientific,
    1,
    8,
    2,
    2,
    OverlayAnchor.bottomLeft,
    {
      workIndicator: false,
    },
  ],
  ['thruster-rpm', OverlayWidgetType.thrusterRpm, 11, 4, 2, 3, OverlayAnchor.right],
  ['depth', OverlayWidgetType.depth, 7, 9, 2, 1, OverlayAnchor.bottomRight],
  ['temperature', OverlayWidgetType.temperature, 9, 9, 2, 1, OverlayAnchor.bottomRight],
  ['battery', OverlayWidgetType.battery, 11, 9, 2, 1, OverlayAnchor.bottomRight],
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
  options,
]: DefaultPlacement): OverlayWidget => ({
  id,
  type,
  column,
  row,
  columnSpan,
  rowSpan,
  anchor,
  options: { ...options },
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

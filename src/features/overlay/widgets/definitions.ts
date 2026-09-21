/**
 * Placement metadata for every overlay widget, free of JSX so it can be tested
 * and reused by the settings editor without pulling in rendering.
 *
 * `Registry.tsx` pairs each entry with its icon and component.
 */

import { OverlayAnchor, OverlayWidgetType, type OverlayWidgetOptions } from '@/stores/overlayTypes';

/** Options a widget type exposes in the settings inspector. */
export const OverlayWidgetOption = {
  workIndicator: 'workIndicator',
} as const;

export type OverlayWidgetOption = (typeof OverlayWidgetOption)[keyof typeof OverlayWidgetOption];

export type OverlayWidgetPlacement = {
  defaultColumnSpan: number;
  defaultRowSpan: number;
  /** Whether the editor offers size controls for this widget. */
  resizable: boolean;
  defaultAnchor: OverlayAnchor;
  defaultOptions: OverlayWidgetOptions;
  options: readonly OverlayWidgetOption[];
};

/* oxlint-disable no-magic-numbers -- default spans are grid cells */
const ATTITUDE_SPAN = 2;
const THRUSTER_COLUMN_SPAN = 2;
const THRUSTER_ROW_SPAN = 3;
const BADGE_COLUMN_SPAN = 2;
/* oxlint-enable no-magic-numbers */

const badge = (defaultAnchor: OverlayAnchor): OverlayWidgetPlacement => ({
  defaultColumnSpan: BADGE_COLUMN_SPAN,
  defaultRowSpan: 1,
  resizable: false,
  defaultAnchor,
  defaultOptions: {},
  options: [],
});

const attitude = (): OverlayWidgetPlacement => ({
  defaultColumnSpan: ATTITUDE_SPAN,
  defaultRowSpan: ATTITUDE_SPAN,
  resizable: true,
  defaultAnchor: OverlayAnchor.bottomLeft,
  defaultOptions: { workIndicator: false },
  options: [OverlayWidgetOption.workIndicator],
});

export const overlayWidgetPlacements: Record<OverlayWidgetType, OverlayWidgetPlacement> = {
  [OverlayWidgetType.connectionStatus]: badge(OverlayAnchor.topLeft),
  [OverlayWidgetType.recording]: badge(OverlayAnchor.topLeft),
  [OverlayWidgetType.attitudeScientific]: attitude(),
  [OverlayWidgetType.attitudeModel3D]: attitude(),
  [OverlayWidgetType.attitudeClassic]: attitude(),
  [OverlayWidgetType.stabilization]: {
    defaultColumnSpan: 1,
    defaultRowSpan: 1,
    resizable: false,
    defaultAnchor: OverlayAnchor.left,
    defaultOptions: {},
    options: [],
  },
  [OverlayWidgetType.thrusterRpm]: {
    defaultColumnSpan: THRUSTER_COLUMN_SPAN,
    defaultRowSpan: THRUSTER_ROW_SPAN,
    resizable: false,
    defaultAnchor: OverlayAnchor.right,
    defaultOptions: {},
    options: [],
  },
  [OverlayWidgetType.depth]: badge(OverlayAnchor.bottomRight),
  [OverlayWidgetType.temperature]: badge(OverlayAnchor.bottomRight),
  [OverlayWidgetType.battery]: badge(OverlayAnchor.bottomRight),
};

const placementsByType = new Map<string, OverlayWidgetPlacement>(
  Object.entries(overlayWidgetPlacements),
);

/**
 * Takes a plain string because a stored layout can name a widget this build
 * does not have — after a downgrade, or a layout authored against a newer
 * telemetry catalogue. Callers skip the widget when this returns undefined.
 */
export const getOverlayWidgetPlacement = (type: string): OverlayWidgetPlacement | undefined =>
  placementsByType.get(type);

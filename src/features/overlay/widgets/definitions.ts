import { OverlayAnchor, OverlayWidgetType, type OverlayWidgetOptions } from '@/stores/overlayTypes';
import { overlayWidgetSizes, type WidgetFootprint } from '@/stores/overlayWidgetSizes';

export type { WidgetFootprint } from '@/stores/overlayWidgetSizes';
export type OverlayWidgetPlacement = {
  defaultColumnSpan: number;
  defaultRowSpan: number;
  sizes: readonly WidgetFootprint[];
  defaultAnchor: OverlayAnchor;
  defaultOptions: OverlayWidgetOptions;
};

const placement = (type: OverlayWidgetType): OverlayWidgetPlacement => {
  const sizes = overlayWidgetSizes[type];
  return {
    defaultColumnSpan: sizes[0].columns,
    defaultRowSpan: sizes[0].rows,
    sizes,
    defaultAnchor: OverlayAnchor.topLeft,
    defaultOptions: {},
  };
};

export const overlayWidgetPlacements: Record<OverlayWidgetType, OverlayWidgetPlacement> = {
  connectionStatus: placement(OverlayWidgetType.connectionStatus),
  recording: placement(OverlayWidgetType.recording),
  workIndicator: placement(OverlayWidgetType.workIndicator),
  attitudeScientific: placement(OverlayWidgetType.attitudeScientific),
  attitudeModel3D: placement(OverlayWidgetType.attitudeModel3D),
  attitudeClassic: placement(OverlayWidgetType.attitudeClassic),
  thrusterRpm1: placement(OverlayWidgetType.thrusterRpm1),
  thrusterRpm2: placement(OverlayWidgetType.thrusterRpm2),
  thrusterRpm3: placement(OverlayWidgetType.thrusterRpm3),
  thrusterRpm4: placement(OverlayWidgetType.thrusterRpm4),
  thrusterRpm5: placement(OverlayWidgetType.thrusterRpm5),
  thrusterRpm6: placement(OverlayWidgetType.thrusterRpm6),
  thrusterRpm7: placement(OverlayWidgetType.thrusterRpm7),
  thrusterRpm8: placement(OverlayWidgetType.thrusterRpm8),
  autoStabilization: placement(OverlayWidgetType.autoStabilization),
  depthHold: placement(OverlayWidgetType.depthHold),
  currentDepth: placement(OverlayWidgetType.currentDepth),
  desiredDepth: placement(OverlayWidgetType.desiredDepth),
  waterTemperature: placement(OverlayWidgetType.waterTemperature),
  electronicsTemperature: placement(OverlayWidgetType.electronicsTemperature),
  batteryLevel: placement(OverlayWidgetType.batteryLevel),
  currentDraw: placement(OverlayWidgetType.currentDraw),
};
const placementsByType = new Map<string, OverlayWidgetPlacement>(
  Object.entries(overlayWidgetPlacements),
);
export const getOverlayWidgetPlacement = (type: string): OverlayWidgetPlacement | undefined =>
  placementsByType.get(type);

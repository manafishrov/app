/**
 * Every placeable overlay element, declared in one table.
 *
 * Adding an element — including, later, a widget bound to an arbitrary
 * telemetry channel advertised by the drone — means adding an entry here and in
 * `definitions.ts`. The overlay renderer and the settings editor both read this
 * registry, so neither needs to know about individual widget types.
 */

import type { Component, JSXElement } from 'solid-js';

import AirIcon from '~icons/material-symbols/air';
import BatteryFullIcon from '~icons/material-symbols/battery-full';
import ThermostatIcon from '~icons/material-symbols/device-thermostat';
import ExploreIcon from '~icons/material-symbols/explore';
import FiberManualRecordIcon from '~icons/material-symbols/fiber-manual-record';
import StraightenIcon from '~icons/material-symbols/straighten';
import TuneIcon from '~icons/material-symbols/tune';
import ViewInArIcon from '~icons/material-symbols/view-in-ar';
import WifiIcon from '~icons/material-symbols/wifi';

import * as m from '@/paraglide/messages';
import { OverlayWidgetType, type OverlayWidget } from '@/stores/overlayTypes';

import { AttitudeIndicator } from '../AttitudeIndicator';
import { AttitudeStyle } from '../attitudeStyle';
import { BatteryIndicator } from '../BatteryIndicator';
import { ConnectionStatusIndicator } from '../ConnectionStatusIndicator';
import { DepthIndicator } from '../DepthIndicator';
import { RecordingIndicator } from '../RecordingIndicator';
import { StabilizationIndicator } from '../StabilizationIndicator';
import { TemperatureIndicator } from '../TemperatureIndicator';
import { ThrusterRpmOverlay } from '../ThrusterRpmOverlay';
import { overlayWidgetPlacements, type OverlayWidgetPlacement } from './definitions';

export { OverlayWidgetOption } from './definitions';

export type OverlayWidgetDefinition = OverlayWidgetPlacement & {
  type: OverlayWidgetType;
  /** Deferred so the label follows locale changes. */
  label: () => string;
  Icon: Component<{ class?: string }>;
  Render: Component<{ widget: OverlayWidget }>;
};

type RegistryEntry = {
  label: () => string;
  Icon: Component<{ class?: string }>;
  Render: Component<{ widget: OverlayWidget }>;
};

const attitudeEntry = (style: AttitudeStyle): Pick<RegistryEntry, 'Render'> => ({
  Render: (props): JSXElement => <AttitudeIndicator style={style} widget={props.widget} />,
});

const entries: Record<OverlayWidgetType, RegistryEntry> = {
  [OverlayWidgetType.connectionStatus]: {
    label: () => m.overlay_widget_connection_status(),
    Icon: WifiIcon,
    Render: () => <ConnectionStatusIndicator />,
  },
  [OverlayWidgetType.recording]: {
    label: () => m.overlay_widget_recording(),
    Icon: FiberManualRecordIcon,
    Render: () => <RecordingIndicator />,
  },
  [OverlayWidgetType.attitudeScientific]: {
    label: () => m.overlay_widget_attitude_scientific(),
    Icon: ExploreIcon,
    ...attitudeEntry(AttitudeStyle.scientific),
  },
  [OverlayWidgetType.attitudeModel3D]: {
    label: () => m.overlay_widget_attitude_3d(),
    Icon: ViewInArIcon,
    ...attitudeEntry(AttitudeStyle.model3D),
  },
  [OverlayWidgetType.attitudeClassic]: {
    label: () => m.overlay_widget_attitude_classic(),
    Icon: AirIcon,
    ...attitudeEntry(AttitudeStyle.classic),
  },
  [OverlayWidgetType.stabilization]: {
    label: () => m.overlay_widget_stabilization(),
    Icon: TuneIcon,
    Render: () => <StabilizationIndicator />,
  },
  [OverlayWidgetType.thrusterRpm]: {
    label: () => m.overlay_widget_thruster_rpm(),
    Icon: AirIcon,
    Render: () => <ThrusterRpmOverlay />,
  },
  [OverlayWidgetType.depth]: {
    label: () => m.overlay_widget_depth(),
    Icon: StraightenIcon,
    Render: () => <DepthIndicator />,
  },
  [OverlayWidgetType.temperature]: {
    label: () => m.overlay_widget_temperature(),
    Icon: ThermostatIcon,
    Render: () => <TemperatureIndicator />,
  },
  [OverlayWidgetType.battery]: {
    label: () => m.overlay_widget_battery(),
    Icon: BatteryFullIcon,
    Render: () => <BatteryIndicator />,
  },
};

const buildDefinitions = (): readonly OverlayWidgetDefinition[] => {
  const built: OverlayWidgetDefinition[] = [];

  for (const type of Object.values(OverlayWidgetType)) {
    built.push({ type, ...overlayWidgetPlacements[type], ...entries[type] });
  }

  return built;
};

const definitions = buildDefinitions();

const definitionsByType = new Map<string, OverlayWidgetDefinition>(
  definitions.map((definition) => [definition.type, definition]),
);

export const overlayWidgetDefinitions = definitions;

/**
 * Takes a plain string because a stored layout can name a widget this build
 * does not have. Callers skip the widget when this returns undefined.
 */
export const getOverlayWidgetDefinition = (type: string): OverlayWidgetDefinition | undefined =>
  definitionsByType.get(type);

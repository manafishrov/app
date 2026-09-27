import { describe, expect, it } from 'vitest';

import { createDefaultOverlayLayout } from '@/stores/overlayDefaults';
import { OverlayWidgetType } from '@/stores/overlayTypes';

import { getOverlayWidgetPlacement, overlayWidgetPlacements } from './definitions';

const [undef] = [] as undefined[];

describe('overlay widget placements', () => {
  it('covers every widget type', () => {
    expect(new Set(Object.keys(overlayWidgetPlacements))).toEqual(
      new Set(Object.values(OverlayWidgetType)),
    );
  });

  it('gives every widget a usable default span', () => {
    for (const placement of Object.values(overlayWidgetPlacements)) {
      expect(placement.defaultColumnSpan).toBeGreaterThan(0);
      expect(placement.defaultRowSpan).toBeGreaterThan(0);
    }
  });

  it('keeps every attitude footprint square', () => {
    for (const type of [
      OverlayWidgetType.attitudeClassic,
      OverlayWidgetType.attitudeModel3D,
      OverlayWidgetType.attitudeScientific,
    ]) {
      for (const size of overlayWidgetPlacements[type].sizes) {
        expect(size.columns).toBe(size.rows);
      }
    }
  });

  it('returns undefined for a type it does not know', () => {
    // A layout stored by a newer build can reference a type this build lacks.
    // The renderer must skip it rather than throw.
    expect(getOverlayWidgetPlacement('fromTheFuture')).toBe(undef);
  });
});

describe('default overlay layout', () => {
  const layout = createDefaultOverlayLayout('Default');

  it('only places widget types the registry knows', () => {
    for (const widget of layout.widgets) {
      expect(getOverlayWidgetPlacement(widget.type)).not.toBe(undef);
    }
  });

  it('keeps every widget inside the grid', () => {
    for (const widget of layout.widgets) {
      expect(widget.column).toBeGreaterThanOrEqual(1);
      expect(widget.row).toBeGreaterThanOrEqual(1);
      expect(widget.column + widget.columnSpan - 1).toBeLessThanOrEqual(layout.columns);
      expect(widget.row + widget.rowSpan - 1).toBeLessThanOrEqual(layout.rows);
    }
  });

  it('gives every widget a unique id', () => {
    const ids = layout.widgets.map((widget) => widget.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Mirrors the Rust default placement.
  it('matches the Rust-side default placement', () => {
    expect(layout.widgets.map((widget) => [widget.id, widget.type])).toEqual([
      ['connection-status', OverlayWidgetType.connectionStatus],
      ['recording', OverlayWidgetType.recording],
      ['stabilization', OverlayWidgetType.autoStabilization],
      ['depth-hold', OverlayWidgetType.depthHold],
      ['attitude', OverlayWidgetType.attitudeScientific],
      ['thruster-rpm-1', OverlayWidgetType.thrusterRpm1],
      ['thruster-rpm-2', OverlayWidgetType.thrusterRpm2],
      ['thruster-rpm-3', OverlayWidgetType.thrusterRpm3],
      ['thruster-rpm-4', OverlayWidgetType.thrusterRpm4],
      ['thruster-rpm-5', OverlayWidgetType.thrusterRpm5],
      ['thruster-rpm-6', OverlayWidgetType.thrusterRpm6],
      ['thruster-rpm-7', OverlayWidgetType.thrusterRpm7],
      ['thruster-rpm-8', OverlayWidgetType.thrusterRpm8],
      ['depth', OverlayWidgetType.currentDepth],
      ['target-depth', OverlayWidgetType.desiredDepth],
      ['water-temperature', OverlayWidgetType.waterTemperature],
      ['electronics-temperature', OverlayWidgetType.electronicsTemperature],
      ['current-draw', OverlayWidgetType.currentDraw],
      ['battery', OverlayWidgetType.batteryLevel],
      ['work', OverlayWidgetType.workIndicator],
    ]);
  });
});

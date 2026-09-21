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

  it('only offers size controls where resizing makes sense', () => {
    // Badges are sized by content; only the attitude indicator fills its rect.
    const resizable = Object.entries(overlayWidgetPlacements)
      .filter(([, placement]) => placement.resizable)
      .map(([type]) => type);

    expect(new Set(resizable)).toEqual(
      new Set([
        OverlayWidgetType.attitudeClassic,
        OverlayWidgetType.attitudeModel3D,
        OverlayWidgetType.attitudeScientific,
      ]),
    );
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

  /**
   * Mirrored by `assert_default_overlay_layout` in
   * `src-tauri/src/models/config.rs`. If this list changes, change the Rust one
   * in the same commit.
   */
  it('matches the Rust-side default placement', () => {
    expect(layout.widgets.map((widget) => [widget.id, widget.type])).toEqual([
      ['connection-status', OverlayWidgetType.connectionStatus],
      ['recording', OverlayWidgetType.recording],
      ['stabilization', OverlayWidgetType.stabilization],
      ['attitude', OverlayWidgetType.attitudeScientific],
      ['thruster-rpm', OverlayWidgetType.thrusterRpm],
      ['depth', OverlayWidgetType.depth],
      ['temperature', OverlayWidgetType.temperature],
      ['battery', OverlayWidgetType.battery],
    ]);
  });
});

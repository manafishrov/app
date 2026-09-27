import { Group, Vector3 } from 'three';
/* oxlint-disable no-magic-numbers -- known roll angles and projected points */
import { describe, expect, it, vi } from 'vitest';

import { setupScene, updateModelRotation } from './Parts';

vi.mock('@/lib/log', () => ({ logError: vi.fn() }));

const projectedRightEdge = (roll: number): Vector3 => {
  const model = new Group();
  const { camera } = setupScene();
  updateModelRotation(model, {
    size: 128,
    pitch: 0,
    roll,
    yaw: 0,
    desiredYaw: 0,
    autoStabilization: false,
  });
  model.updateMatrixWorld();
  camera.updateMatrixWorld();
  return new Vector3(1, 0, 0).applyMatrix4(model.matrixWorld).project(camera);
};

describe('3D attitude roll direction', () => {
  it('shows positive roll with the right edge down, matching the scientific vehicle marker', () => {
    // NDC y increases upwards; SVG screen y increases downwards.
    expect(projectedRightEdge(30).y).toBeLessThan(0);
  });
  it('shows negative roll with the right edge up', () => {
    expect(projectedRightEdge(-30).y).toBeGreaterThan(0);
  });
  it('keeps a level vehicle horizontal', () => {
    expect(projectedRightEdge(0).y).toBeCloseTo(0);
  });
});

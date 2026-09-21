/**
 * Visual styles the attitude indicator can be drawn in. Each one is registered
 * as its own placeable widget type, so choosing a style is the same action as
 * placing it — there is no separate "which indicator" setting, and no
 * "disabled" state.
 */
export const AttitudeStyle = {
  scientific: 'scientific',
  model3D: 'model3D',
  classic: 'classic',
} as const;

export type AttitudeStyle = (typeof AttitudeStyle)[keyof typeof AttitudeStyle];

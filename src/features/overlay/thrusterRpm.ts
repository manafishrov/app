const NOT_FOUND_INDEX = -1;

/**
 * RPM telemetry arrives in output pin order, while thrusters are numbered by
 * the identifier each pin drives in the pin setup. Read the first pin wired to
 * the thruster, or 0 when no pin drives it.
 */
export const thrusterRpmFor = (
  thruster: number,
  identifiers: readonly number[],
  rpms: readonly number[],
): number => {
  const pin = identifiers.indexOf(thruster);
  return pin === NOT_FOUND_INDEX ? 0 : (rpms[pin] ?? 0);
};

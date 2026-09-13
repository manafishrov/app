export const formatCurrentDraw = (value: number | null): string =>
  value === null ? '— A' : `${value.toFixed(0)}A`;

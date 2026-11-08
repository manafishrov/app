/** Opt in with localStorage.detectionDiagnostics = '1', then reload. Durations
 * stay in this webview's performance clock; native stages have their own clock. */
const stages = ['capture', 'submitRoundTrip', 'render'] as const;
type Stage = (typeof stages)[number];
type Measurement = { count: number; totalMs: number; maxMs: number };
const totals: Partial<Record<Stage, Measurement>> = {};
let enabled = false;
try {
  enabled = globalThis.localStorage.getItem('detectionDiagnostics') === '1';
} catch {
  /* Storage may be disabled. */
}

export const recordTiming = (stage: Stage, elapsed: number): void => {
  if (!enabled) {
    return;
  }
  const current = totals[stage] ?? { count: 0, totalMs: 0, maxMs: 0 };
  current.count += 1;
  current.totalMs += elapsed;
  current.maxMs = Math.max(current.maxMs, elapsed);
  totals[stage] = current;
};

if (enabled) {
  Object.assign(globalThis, {
    detectionTimings: () =>
      Object.fromEntries(
        stages.map((stage) => {
          const value = totals[stage];
          return [
            stage,
            value && {
              count: value.count,
              meanMs: value.totalMs / value.count,
              maxMs: value.maxMs,
            },
          ];
        }),
      ),
  });
}

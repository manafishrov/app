export const RETENTION_BATCH_SIZE = 200;
export const RETENTION_BATCH_DELAY_MS = 1000;
const SECONDS_PER_HOUR = 3600;
const MILLISECONDS_PER_SECOND = 1000;
export const RETENTION_SWEEP_INTERVAL_MS = SECONDS_PER_HOUR * MILLISECONDS_PER_SECOND;

// A successful write requests maintenance but never awaits it.
// Each short transaction yields before the next batch; writers coalesce into one sweep.
export const createLogRetentionScheduler = (runBatch: () => Promise<boolean>): (() => void) => {
  let running = false;
  let nextSweepAt = 0;
  const finish = (): void => {
    running = false;
    nextSweepAt = Date.now() + RETENTION_SWEEP_INTERVAL_MS;
  };
  const run = (): void => {
    Promise.resolve()
      .then(runBatch)
      .then((hasMore) => {
        if (hasMore) {
          globalThis.setTimeout(run, RETENTION_BATCH_DELAY_MS);
        } else {
          finish();
        }
      })
      .catch(finish);
  };
  return (): void => {
    if (running || Date.now() < nextSweepAt) {
      return;
    }
    running = true;
    globalThis.setTimeout(run, RETENTION_BATCH_DELAY_MS);
  };
};

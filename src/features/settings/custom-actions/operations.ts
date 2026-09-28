import type { Accessor } from 'solid-js';

import { logError } from '@/lib/log';

export type Operation = {
  busy: Accessor<boolean>;
  error: Accessor<string>;
  message: Accessor<string>;
  run: (task: () => Promise<unknown>, success?: string) => void;
};

/** Keep the failure alongside the control and in the searchable debug log. */
export const createOperation = (): Operation => {
  const [busy, setBusy] = createSignal(false);
  const [errorMessage, setError] = createSignal('');
  const [message, setMessage] = createSignal('');
  const run: Operation['run'] = (task, success) => {
    if (busy()) {
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    Promise.resolve()
      .then(task)
      .then(() => setMessage(success ?? ''))
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        setError(detail);
        logError('Custom actions / CSV operation failed:', detail);
      })
      .finally(() => setBusy(false));
  };
  return { busy, error: errorMessage, message, run };
};

import { Button } from '@manafishrov/ui/button';
import { toast } from '@manafishrov/ui/toaster';
import { createSignal, type Component } from 'solid-js';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { exportAllLogs } from '@/tauri/logExport';

export const ExportLogsButton: Component = () => {
  const [busy, setBusy] = createSignal(false);
  const handleExport = (): void => {
    if (busy()) {
      return;
    }
    setBusy(true);
    exportAllLogs(m.debug_export_dialog_title())
      .then((saved) => {
        if (saved) {
          toast.create({ title: m.debug_export_success(), type: 'success' });
        }
      })
      .catch((error: unknown) => {
        logError('Failed to export logs', error);
        toast.create({ title: m.debug_export_failed(), type: 'error' });
      })
      .finally(() => setBusy(false));
  };

  return (
    <Button
      size='sm'
      variant='outline'
      disabled={busy()}
      aria-busy={busy()}
      title={m.debug_export_privacy()}
      onClick={handleExport}
    >
      {busy() ? m.debug_export_busy() : m.debug_export_all()}
    </Button>
  );
};

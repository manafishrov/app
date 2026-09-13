import { getVersion } from '@tauri-apps/api/app';

import { getStoredLogRecords } from '@/lib/log';
import { formatLogExport } from '@/lib/logExport';
import { invokeCommand } from '@/tauri/core';

export const exportAllLogs = (title: string): Promise<boolean> =>
  Promise.all([getStoredLogRecords(), getVersion()]).then(([records, version]) =>
    invokeCommand<boolean>(
      'export_logs',
      { contents: formatLogExport(records, version, new Date()), title },
      { warnOnly: true },
    ),
  );

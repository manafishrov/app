import { getVersion } from '@tauri-apps/api/app';

import { getStoredLogRecords } from '@/lib/log';
import { formatLogExport } from '@/lib/logExport';
import { invokeCommand } from '@/tauri/core';

const LOG_EXPORT_FILE_NAME = 'manafish-logs.jsonl';

export const exportAllLogs = (title: string): Promise<boolean> =>
  Promise.all([getStoredLogRecords(), getVersion()]).then(([records, version]) =>
    invokeCommand<boolean>(
      'save_text_file',
      {
        contents: formatLogExport(records, version, new Date()),
        title,
        fileName: LOG_EXPORT_FILE_NAME,
      },
      { warnOnly: true },
    ),
  );

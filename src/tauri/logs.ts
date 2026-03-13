import { createLogRecord, type LogEntry } from '@/lib/log';
import { createListener } from '@/tauri/core';

const EVENT = 'log_message';

const ignoreCreateLogRecordResult = (): void => {
  Number.isNaN(Number.NaN);
};

export const setupLogsListener = (): Promise<() => void> =>
  createListener<LogEntry>(EVENT, (entry): void => {
    createLogRecord(entry).then(ignoreCreateLogRecordResult).catch(ignoreCreateLogRecordResult);
  });

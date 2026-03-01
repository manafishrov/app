import { createLogRecord, type LogEntry } from '@/lib/log';
import { createListener } from '@/tauri/core';

const EVENT = 'log_message';

export const setupLogsListener = () => {
  return createListener<LogEntry>(EVENT, createLogRecord);
};

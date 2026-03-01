import { createLogRecord, type LogEntry } from '@/log';
import { createListener } from '@/tauri/core';

const EVENT = 'log_message';

export const setupLogsListener = () => {
  return createListener<LogEntry>(EVENT, createLogRecord);
};

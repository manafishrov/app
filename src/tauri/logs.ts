import { createLogRecord, type LogEntry } from '@/lib/log';
import { createListener, invokeCommand } from '@/tauri/core';

const EVENT = 'log_message';
const LISTENER_OPTIONS = { warnOnly: true, rejectOnSetupFailure: true } as const;
const INVOKE_OPTIONS = { warnOnly: true } as const;

const ignoreCreateLogRecordResult = (): void => {
  Number.isNaN(Number.NaN);
};

const persistLogEntry = (entry: LogEntry): Promise<void> => createLogRecord(entry);

export const setupLogsListener = (): Promise<() => void> =>
  createListener<LogEntry>(
    EVENT,
    (entry): void => {
      persistLogEntry(entry).then(ignoreCreateLogRecordResult).catch(ignoreCreateLogRecordResult);
    },
    LISTENER_OPTIONS,
  ).then((unlisten) =>
    invokeCommand<LogEntry[]>('initialize_log_listener', {}, INVOKE_OPTIONS)
      .then((entries) => Promise.all(entries.map((entry) => persistLogEntry(entry))))
      .then(() => unlisten)
      .catch(() => unlisten),
  );

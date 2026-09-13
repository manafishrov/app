import { type DBSchema, type IDBPDatabase, type OpenDBCallbacks, deleteDB, openDB } from 'idb';

import { createLogRetentionScheduler, RETENTION_BATCH_SIZE } from './logRetention';

const LogLevel = {
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const;

const LogOrigin = {
  frontend: 'frontend',
  backend: 'backend',
  firmware: 'firmware',
  mcu: 'mcu',
} as const;

type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];
type LogOrigin = (typeof LogOrigin)[keyof typeof LogOrigin];

type LogEntry = {
  origin: LogOrigin;
  level: LogLevel;
  message: string;
};

type StoredLogRecord = {
  id: number;
  origin: LogOrigin;
  level: LogLevel;
  message: string;
  timestamp: Date;
};

type LogRecord = StoredLogRecord;

type NewLogRecord = Omit<LogRecord, 'id'>;

type LogDatabase = {
  logRecords: {
    key: number;
    value: NewLogRecord | StoredLogRecord;
    indexes: { timestamp: Date };
  };
} & DBSchema;

const DB_NAME = 'ManafishLogsDB';
const DB_VERSION = 1;
const LOG_STORE_NAME = 'logRecords';
const DEFAULT_LOG_RETENTION_DAYS = 7;

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;

const dbCallbacks: OpenDBCallbacks<LogDatabase> = {
  upgrade: (database): void => {
    if (!database.objectStoreNames.contains(LOG_STORE_NAME)) {
      const store = database.createObjectStore(LOG_STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('timestamp', 'timestamp');
    }
  },
};

let dbPromise: Promise<IDBPDatabase<LogDatabase>> = openDB<LogDatabase>(
  DB_NAME,
  DB_VERSION,
  dbCallbacks,
);

const ignorePromiseRejection = (): void => {
  Number.isNaN(Number.NaN);
};

const shouldRecoverNotFound = (retry: boolean, error: unknown): error is DOMException =>
  retry && error instanceof DOMException && error.name === 'NotFoundError';

const resetDatabase = (): Promise<void> =>
  dbPromise
    .then((database) => {
      database.close();
      return deleteDB(DB_NAME);
    })
    .then(() => {
      dbPromise = openDB<LogDatabase>(DB_NAME, DB_VERSION, dbCallbacks);
    });

const withErrorHandling = <ResultType>(
  operation: (database: IDBPDatabase<LogDatabase>) => Promise<ResultType>,
  retry = true,
): Promise<ResultType> =>
  dbPromise
    .then((database) => operation(database))
    .catch((error: unknown) => {
      if (!shouldRecoverNotFound(retry, error)) {
        throw error;
      }

      return resetDatabase().then(() => withErrorHandling(operation, false));
    });

const dispatchLogAddedEvent = (record: LogRecord): void => {
  globalThis.dispatchEvent(
    new CustomEvent<LogRecord>('log:added', {
      detail: record,
    }),
  );
};

const isStoredLogRecord = (value: unknown): value is StoredLogRecord =>
  value instanceof Object && 'id' in value && typeof value.id === 'number';

const formatLog = (...args: unknown[]): string =>
  args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.stack ?? String(arg);
      }

      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return '[Circular object]';
        }
      }

      return String(arg);
    })
    .join(' ');

const createRetentionCutoff = (maxAgeDays: number): Date =>
  new Date(
    Date.now() -
      maxAgeDays * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
  );

// Maintenance must not recover a failed operation by deleting the database.
export const deleteExpiredLogBatch = (): Promise<boolean> => {
  const cutoffDate = createRetentionCutoff(DEFAULT_LOG_RETENTION_DAYS);

  return dbPromise.then((database) => {
    const transaction = database.transaction(LOG_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(LOG_STORE_NAME);
    const index = store.index('timestamp');

    return index.openCursor(IDBKeyRange.upperBound(cutoffDate)).then((initialCursor) => {
      const deleteFromCursor = (
        currentCursor: typeof initialCursor,
        deletedCount: number,
      ): Promise<boolean> => {
        if (currentCursor === null || deletedCount >= RETENTION_BATCH_SIZE) {
          return transaction.done.then(() => currentCursor !== null);
        }

        return currentCursor
          .delete()
          .then(() => currentCursor.continue())
          .then((nextCursor) => deleteFromCursor(nextCursor, deletedCount + 1));
      };

      return deleteFromCursor(initialCursor, 0);
    });
  });
};

const scheduleLogRetention = createLogRetentionScheduler(deleteExpiredLogBatch);

const createLogRecord = (logEntry: LogEntry): Promise<void> =>
  withErrorHandling((database) => {
    const newRecord: NewLogRecord = {
      ...logEntry,
      timestamp: new Date(),
    };

    return database
      .add(LOG_STORE_NAME, newRecord)
      .then((recordId) => database.get(LOG_STORE_NAME, recordId))
      .then((fullRecord) => {
        if (isStoredLogRecord(fullRecord)) {
          dispatchLogAddedEvent(fullRecord);
          scheduleLogRetention();
        }
      });
  });

const writeLog = (level: LogLevel, ...args: unknown[]): void => {
  createLogRecord({
    message: formatLog(...args),
    level,
    origin: 'frontend',
  }).catch(ignorePromiseRejection);
};

const readStoredLogRecords = (database: IDBPDatabase<LogDatabase>): Promise<LogRecord[]> =>
  database
    .getAll(LOG_STORE_NAME)
    .then((records) =>
      records.filter((record): record is StoredLogRecord => isStoredLogRecord(record)),
    );

// Export must never prune or recover by deleting the database on a read failure.
const getStoredLogRecords = (): Promise<LogRecord[]> => dbPromise.then(readStoredLogRecords);

export const LOG_PAGE_SIZE = 500;

// Read only one page by primary key; opening the viewer must not scan retention or all records.
export const getLogRecordPage = (
  before?: number,
): Promise<{ records: LogRecord[]; hasOlder: boolean }> =>
  dbPromise.then((database) => {
    const transaction = database.transaction(LOG_STORE_NAME);
    const range = typeof before === 'number' ? IDBKeyRange.upperBound(before, true) : null;
    const records: LogRecord[] = [];
    return transaction.store.openCursor(range, 'prev').then((initialCursor) => {
      const readCursor = (
        cursor: typeof initialCursor,
      ): Promise<{ records: LogRecord[]; hasOlder: boolean }> => {
        if (!cursor || records.length >= LOG_PAGE_SIZE) {
          return transaction.done.then(() => ({
            // ES2022 WebViews lack toReversed; records belongs only to this read.
            // eslint-disable-next-line unicorn/no-array-reverse
            records: records.reverse(),
            hasOlder: cursor !== null,
          }));
        }
        if (isStoredLogRecord(cursor.value)) {
          records.push(cursor.value);
        }
        return cursor.continue().then(readCursor);
      };
      return readCursor(initialCursor);
    });
  });

const clearAllLogRecords = (): Promise<void> =>
  withErrorHandling((database) => database.clear(LOG_STORE_NAME));

const logInfo = (...args: unknown[]): void => {
  writeLog('info', ...args);
};

const logWarn = (...args: unknown[]): void => {
  writeLog('warn', ...args);
};

const logError = (...args: unknown[]): void => {
  writeLog('error', ...args);
};

export {
  logInfo,
  logWarn,
  logError,
  getStoredLogRecords,
  clearAllLogRecords,
  createLogRecord,
  type LogRecord,
  type LogEntry,
  LogLevel,
  LogOrigin,
};

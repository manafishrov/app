import {
  type DBSchema,
  type IDBPDatabase,
  type OpenDBCallbacks,
  deleteDB,
  openDB,
} from 'idb';

import { configStore } from '@/stores/config';

type LogLevel = 'info' | 'warn' | 'error';
type LogOrigin = 'frontend' | 'backend' | 'firmware';

type LogEntry = {
  origin: LogOrigin;
  level: LogLevel;
  message: string;
};

type LogRecord = {
  id: number;
  origin: LogOrigin;
  level: LogLevel;
  message: string;
  timestamp: Date;
};

type NewLogRecord = Omit<LogRecord, 'id'>;

type LogDatabase = {
  logRecords: {
    key: number;
    value: LogRecord;
    indexes: { timestamp: Date };
  };
} & DBSchema;

const DB_NAME = 'ManafishLogsDB';
const DB_VERSION = 1;
const LOG_STORE_NAME = 'logRecords';

const dbCallbacks: OpenDBCallbacks<LogDatabase> = {
  upgrade(db) {
    if (!db.objectStoreNames.contains(LOG_STORE_NAME)) {
      const store = db.createObjectStore(LOG_STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('timestamp', 'timestamp');
    }
  },
};

let dbPromise = openDB<LogDatabase>(DB_NAME, DB_VERSION, dbCallbacks);

async function withErrorHandling<T>(
  operation: (db: IDBPDatabase<LogDatabase>) => Promise<T>,
  retry = true,
): Promise<T> {
  try {
    const db = await dbPromise;
    return await operation(db);
  } catch (error) {
    if (
      retry &&
      error instanceof DOMException &&
      error.name === 'NotFoundError'
    ) {
      console.warn(
        'Object store not found. Deleting database and retrying operation.',
      );
      const db = await dbPromise;
      db.close();
      await deleteDB(DB_NAME);
      dbPromise = openDB<LogDatabase>(DB_NAME, DB_VERSION, dbCallbacks);
      return await withErrorHandling(operation, false);
    }
    throw error;
  }
}

async function createLogRecord(logEntry: LogEntry): Promise<void> {
  if (logEntry.level === 'info' && !configStore.state?.infoLogging) {
    return;
  }

  await withErrorHandling(async (db) => {
    const newRecord: NewLogRecord = {
      ...logEntry,
      timestamp: new Date(),
    };

    const id = await db.add(LOG_STORE_NAME, newRecord as LogRecord);
    const fullRecord = await db.get(LOG_STORE_NAME, id);

    if (fullRecord) {
      window.dispatchEvent(
        new CustomEvent<LogRecord>('log:added', {
          detail: fullRecord,
        }),
      );
    }
  });
}

function formatLog(...args: unknown[]): string {
  return args
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
}

function logInfo(...args: unknown[]): void {
  void createLogRecord({
    message: formatLog(...args),
    level: 'info',
    origin: 'frontend',
  });
}

function logWarn(...args: unknown[]): void {
  void createLogRecord({
    message: formatLog(...args),
    level: 'warn',
    origin: 'frontend',
  });
}

function logError(...args: unknown[]): void {
  void createLogRecord({
    message: formatLog(...args),
    level: 'error',
    origin: 'frontend',
  });
}

async function getAllLogRecords(): Promise<LogRecord[]> {
  return withErrorHandling((db) => db.getAll(LOG_STORE_NAME));
}

async function clearAllLogRecords(): Promise<void> {
  await withErrorHandling((db) => db.clear(LOG_STORE_NAME));
}

export {
  logInfo,
  logWarn,
  logError,
  getAllLogRecords,
  clearAllLogRecords,
  createLogRecord,
  type LogRecord,
  type LogEntry,
};

import {
  type DBSchema,
  type IDBPDatabase,
  type OpenDBCallbacks,
  deleteDB,
  openDB,
} from 'idb';

import { configStore } from '@/stores/configStore';

type LogLevel = 'Info' | 'Warn' | 'Error';

type LogOrigin = 'Frontend' | 'Backend' | 'Firmware';

type Log = {
  level: LogLevel;
  message: string;
};

type LogMessage = {
  id: number;
  level: LogLevel;
  message: string;
  origin: LogOrigin;
  timestamp: Date;
};

type LogDatabase = {
  logMessages: {
    key: number;
    value: LogMessage;
    indexes: { timestamp: Date };
  };
} & DBSchema;

const DB_NAME = 'manafish-db';
const DB_VERSION = 1;

const dbCallbacks: OpenDBCallbacks<LogDatabase> = {
  upgrade(db) {
    if (!db.objectStoreNames.contains('logMessages')) {
      const store = db.createObjectStore('logMessages', {
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

async function addLogMessage(
  message: string,
  level: LogLevel,
  origin: LogOrigin,
) {
  if (level === 'Info' && !configStore.state?.infoLogging) {
    return;
  }

  await withErrorHandling(async (db) => {
    const newLogEntry = {
      message,
      level,
      origin,
      timestamp: new Date(),
    };

    const id = await db.add('logMessages', newLogEntry as LogMessage);
    const fullMessage = await db.get('logMessages', id);

    if (fullMessage) {
      window.dispatchEvent(
        new CustomEvent<LogMessage>('logmessage', {
          detail: fullMessage,
        }),
      );
    }
  });
}

function formatLog(...args: unknown[]) {
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

function logInfo(...args: unknown[]) {
  void addLogMessage(formatLog(...args), 'Info', 'Frontend');
}

function logWarn(...args: unknown[]) {
  void addLogMessage(formatLog(...args), 'Warn', 'Frontend');
}

function logError(...args: unknown[]) {
  void addLogMessage(formatLog(...args), 'Error', 'Frontend');
}

async function getLogMessages() {
  return withErrorHandling((db) => db.getAll('logMessages'));
}

async function clearLogMessages() {
  await withErrorHandling((db) => db.clear('logMessages'));
}

export {
  addLogMessage,
  logInfo,
  logWarn,
  logError,
  getLogMessages,
  clearLogMessages,
  type Log,
  type LogMessage,
};

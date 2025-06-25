import { type DBSchema, openDB } from 'idb';

type LogLevel = 'info' | 'warn' | 'error';

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

const dbPromise = openDB<LogDatabase>('manafish-db', 1, {
  upgrade(db) {
    const store = db.createObjectStore('logMessages', {
      keyPath: 'id',
      autoIncrement: true,
    });
    store.createIndex('timestamp', 'timestamp');
  },
});

async function addLogMessage(
  message: string,
  level: LogLevel,
  origin: LogOrigin,
) {
  const db = await dbPromise;
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
  void addLogMessage(formatLog(...args), 'info', 'Frontend');
}

function logWarn(...args: unknown[]) {
  void addLogMessage(formatLog(...args), 'warn', 'Frontend');
}

function logError(...args: unknown[]) {
  void addLogMessage(formatLog(...args), 'error', 'Frontend');
}

async function getLogMessages() {
  const db = await dbPromise;
  return db.getAll('logMessages');
}

async function clearLogMessages() {
  const db = await dbPromise;
  await db.clear('logMessages');
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

import { type DBSchema, openDB } from 'idb';

export type DebugMessage = {
  id: number;
  message: string;
  logType: 'info' | 'error';
  origin: 'Frontend' | 'Backend' | 'Firmware';
  timestamp: Date;
};

export type Debug = {
  logType: 'info' | 'error';
  message: string;
  origin: 'Frontend' | 'Backend' | 'Firmware';
  timestamp: Date;
};

type DebugDB = {
  debugMessages: {
    key: number;
    value: DebugMessage;
    indexes: { timestamp: Date };
  };
} & DBSchema;

const dbPromise = openDB<DebugDB>('manafish-db', 1, {
  upgrade(db) {
    const store = db.createObjectStore('debugMessages', {
      keyPath: 'id',
      autoIncrement: true,
    });
    store.createIndex('timestamp', 'timestamp');
  },
});

async function addDebugMessage(
  message: string,
  logType: 'info' | 'error',
  origin: 'Frontend' | 'Backend' | 'Firmware',
) {
  const db = await dbPromise;
  const newLogEntry = {
    message,
    logType,
    origin,
    timestamp: new Date(),
  };

  const id = await db.add(
    'debugMessages',
    newLogEntry as unknown as DebugMessage,
  );

  const fullMessage = await db.get('debugMessages', id);

  if (fullMessage) {
    window.dispatchEvent(
      new CustomEvent<DebugMessage>('debug-message', {
        detail: fullMessage,
      }),
    );
  }
}

async function getDebugMessages(): Promise<DebugMessage[]> {
  const db = await dbPromise;
  return db.getAll('debugMessages');
}

async function clearDebugMessages() {
  const db = await dbPromise;
  await db.clear('debugMessages');
}

function debugLog(message: string) {
  void addDebugMessage(message, 'info', 'Frontend');
}

function debugError(message: string) {
  void addDebugMessage(message, 'error', 'Frontend');
}

export {
  debugLog,
  debugError,
  addDebugMessage,
  getDebugMessages,
  clearDebugMessages,
};

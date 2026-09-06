import { deleteDB, openDB } from 'idb';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
  invokeCommand: vi.fn(),
}));
vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve(mocks)),
  deleteDB: vi.fn(),
}));

vi.mock('@tauri-apps/api/app', () => ({ getVersion: vi.fn(() => Promise.resolve('1.2.3')) }));
vi.mock('@/tauri/core', () => ({ invokeCommand: mocks.invokeCommand }));

import { getStoredLogRecords } from '@/lib/log';
import { exportAllLogs } from '@/tauri/logExport';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAll.mockReset();
});

it('reads all stored records in database order without retention deletion', () => {
  const records = [
    { id: 1, timestamp: new Date('2020-01-01'), origin: 'firmware', level: 'warn', message: 'old' },
    {
      id: 2,
      timestamp: new Date('2019-01-01'),
      origin: 'mcu',
      level: 'error',
      message: 'clock stepped back',
    },
  ];
  mocks.getAll.mockResolvedValue(records);
  return getStoredLogRecords().then((result) => {
    expect(result).toEqual(records);
    expect(mocks.getAll).toHaveBeenCalledExactlyOnceWith('logRecords');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

it.each(['throw', 'reject'])(
  'fails export on NotFoundError (%s) without resetting the database or invoking Save',
  (failure) => {
    const error = new DOMException('Log store not found', 'NotFoundError');
    mocks.getAll.mockImplementation(() => {
      if (failure === 'throw') {
        throw error;
      }
      return Promise.reject(error);
    });
    return expect(exportAllLogs('Save logs'))
      .rejects.toBe(error)
      .then(() => {
        expect(mocks.getAll).toHaveBeenCalledExactlyOnceWith('logRecords');
        expect(mocks.invokeCommand).not.toHaveBeenCalled();
        expect(mocks.transaction).not.toHaveBeenCalled();
        expect(mocks.close).not.toHaveBeenCalled();
        expect(deleteDB).not.toHaveBeenCalled();
        expect(openDB).not.toHaveBeenCalled();
      });
  },
);

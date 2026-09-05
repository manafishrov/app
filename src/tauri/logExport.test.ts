import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getStoredLogRecords: vi.fn(),
  getVersion: vi.fn(),
  invokeCommand: vi.fn(),
}));
vi.mock('@/lib/log', () => ({ getStoredLogRecords: mocks.getStoredLogRecords }));
vi.mock('@tauri-apps/api/app', () => ({ getVersion: mocks.getVersion }));
vi.mock('@/tauri/core', () => ({ invokeCommand: mocks.invokeCommand }));

import { exportAllLogs } from '@/tauri/logExport';

const records = ['frontend', 'backend', 'firmware', 'mcu'].map((origin, index) => ({
  id: index + 1,
  origin,
  level: 'info',
  message: `message ${index}\nsecond line\r\n"quoted" \\ λ`,
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getStoredLogRecords.mockResolvedValue(records);
  mocks.getVersion.mockResolvedValue('1.2.3');
  mocks.invokeCommand.mockResolvedValue(true);
});

const exportedLines = (): unknown[] => {
  const [call = []]: unknown[][] = mocks.invokeCommand.mock.calls;
  const [, args] = call;
  const value: unknown = args;
  if (
    typeof value !== 'object' ||
    value === null ||
    !('contents' in value) ||
    typeof value.contents !== 'string'
  ) {
    throw new TypeError('Expected JSONL contents');
  }
  return value.contents
    .trimEnd()
    .split('\n')
    .map((line): unknown => JSON.parse(line));
};

it('exports every stored record in order without viewer filters or pause state', () =>
  exportAllLogs('Save logs').then((saved) => {
    expect(saved).toBe(true);
    expect(mocks.getStoredLogRecords).toHaveBeenCalledExactlyOnceWith();
    const lines = exportedLines();
    expect(lines[0]).toMatchObject({
      type: 'metadata',
      appVersion: '1.2.3',
      recordCount: records.length,
      cutoff:
        'Stored-log snapshot captured before the Save dialog opens; logs arriving after capture are excluded.',
      exportedAtUtc: expect.stringMatching(/Z$/) as unknown,
    });
    expect(lines.slice(1)).toEqual(
      records.map((record) => ({
        type: 'log',
        id: record.id,
        origin: record.origin,
        level: record.level,
        message: record.message,
        receivedAtUtc: record.timestamp.toISOString(),
      })),
    );
  }));

it('returns cancellation without an error', () => {
  mocks.invokeCommand.mockResolvedValue(false);
  return expect(exportAllLogs('Save')).resolves.toBe(false);
});

it('propagates dialog or write failure', () => {
  mocks.invokeCommand.mockRejectedValue(new Error('write failed'));
  return expect(exportAllLogs('Save')).rejects.toThrow('write failed');
});

it('does not open a dialog or write a partial export if storage fails', () => {
  mocks.getStoredLogRecords.mockRejectedValue(new Error('read failed'));
  return expect(exportAllLogs('Save'))
    .rejects.toThrow('read failed')
    .then(() => {
      expect(mocks.invokeCommand).not.toHaveBeenCalled();
    });
});

it('exports metadata even for an empty database', () => {
  mocks.getStoredLogRecords.mockResolvedValue([]);
  return exportAllLogs('Save').then(() => {
    expect(exportedLines()).toEqual([expect.objectContaining({ recordCount: 0 })]);
  });
});

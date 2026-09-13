import type { LogRecord } from '@/lib/log';

export const formatLogExport = (
  records: readonly LogRecord[],
  appVersion: string,
  exportedAt: Date,
): string =>
  [
    JSON.stringify({
      type: 'metadata',
      appVersion,
      exportedAtUtc: exportedAt.toISOString(),
      recordCount: records.length,
      cutoff:
        'Stored-log snapshot captured before the Save dialog opens; logs arriving after capture are excluded.',
      ordering: 'IndexedDB insertion order (id ascending)',
      timestamps: 'App receipt UTC; source clocks, when available, are in message text.',
      privacy: 'Messages are exported verbatim, not automatically redacted. Review before sharing.',
    }),
    ...records.map((record) =>
      JSON.stringify({
        type: 'log',
        id: record.id,
        receivedAtUtc: record.timestamp.toISOString(),
        origin: record.origin,
        level: record.level,
        message: record.message,
      }),
    ),
    '',
  ].join('\n');

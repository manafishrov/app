import { createFileRoute } from '@tanstack/solid-router';

import { CsvLoggingPage } from '@/features/settings/extensions/CsvLoggingPage';

export const Route = createFileRoute('/settings/rov/csv-logging/')({ component: CsvLoggingPage });

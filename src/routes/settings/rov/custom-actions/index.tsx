import { createFileRoute } from '@tanstack/solid-router';

import { CustomActionsPage } from '@/features/settings/extensions/CustomActionsPage';

export const Route = createFileRoute('/settings/rov/custom-actions/')({
  component: CustomActionsPage,
});

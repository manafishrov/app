import { createFileRoute } from '@tanstack/solid-router';

import { CustomActionsPage } from '@/features/settings/custom-actions/CustomActionsPage';

export const Route = createFileRoute('/settings/rov/custom-actions/')({
  component: CustomActionsPage,
});

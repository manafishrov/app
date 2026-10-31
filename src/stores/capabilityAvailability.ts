import type { ActionDescriptor, ReadingDescriptor } from '@/stores/capabilityTypes';

import { capabilityStore } from '@/stores/capabilities';

/** Installed descriptors remain discoverable while their custom action is stopped. */
export const isCapabilityAvailable = (
  descriptor: ActionDescriptor | ReadingDescriptor | undefined,
): boolean => {
  if (!capabilityStore.connected || !descriptor) {
    return false;
  }
  if (descriptor.customActionId === null) {
    return true;
  }
  const customAction = capabilityStore.catalog.customActions.find(
    (entry) => entry.id === descriptor.customActionId,
  );
  return Boolean(customAction && customAction.enabled && customAction.status === 'running');
};

export const isActionAvailable = (id: string): boolean =>
  isCapabilityAvailable(capabilityStore.catalog.actions.find((action) => action.id === id));

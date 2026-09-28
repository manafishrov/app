import type { ActionDescriptor, ReadingDescriptor } from '@/stores/capabilityTypes';

import { capabilityStore } from '@/stores/capabilities';

/** Installed descriptors remain discoverable while their extension is stopped. */
export const isCapabilityAvailable = (
  descriptor: ActionDescriptor | ReadingDescriptor | undefined,
): boolean => {
  if (!capabilityStore.connected || !descriptor) {
    return false;
  }
  if (descriptor.extensionId === null) {
    return true;
  }
  const extension = capabilityStore.catalog.extensions.find(
    (entry) => entry.id === descriptor.extensionId,
  );
  return Boolean(extension && extension.enabled && extension.status === 'running');
};

export const isActionAvailable = (id: string): boolean =>
  isCapabilityAvailable(capabilityStore.catalog.actions.find((action) => action.id === id));

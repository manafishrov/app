import { unwrap } from 'solid-js/store';

import { configStore } from '@/stores/config';
import { setConfig } from '@/tauri/config';

/** Installing another model must not replace the user's current selection. */
export const selectModelIfNoneActive = (id: string): Promise<void> => {
  if (configStore.detection.modelId !== null) {
    return Promise.resolve();
  }
  const detection = structuredClone(unwrap(configStore.detection));
  return setConfig({ detection: { ...detection, modelId: id } });
};

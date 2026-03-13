import { setDirectionVectorStore, type DirectionVector } from '@/stores/directionVector';
import { invokeCommand } from '@/tauri/core';

export const sendDirectionVector = (command: DirectionVector): Promise<void> => {
  setDirectionVectorStore(command);
  return invokeCommand('send_direction_vector', { payload: command }, { warnOnly: true });
};

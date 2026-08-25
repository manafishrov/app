import { setDirectionVectorStore, type DirectionVector } from '@/stores/directionVector';
import { invokeCommand } from '@/tauri/core';

const EMPTY_DIRECTION_VECTOR: DirectionVector = [0, 0, 0, 0, 0, 0, 0, 0];

export const deactivateDirectionVector = (): Promise<void> => {
  setDirectionVectorStore(EMPTY_DIRECTION_VECTOR);
  return invokeCommand('deactivate_direction_vector', {}, { warnOnly: true });
};

export const sendDirectionVector = (command: DirectionVector): Promise<void> => {
  setDirectionVectorStore(command);
  return invokeCommand('send_direction_vector', { payload: command }, { warnOnly: true });
};

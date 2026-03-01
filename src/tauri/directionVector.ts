import { setDirectionVectorStore, type DirectionVector } from '@/stores/directionVector';
import { invokeCommand } from '@/tauri/core';

export async function sendDirectionVector(command: DirectionVector) {
  setDirectionVectorStore(command);
  await invokeCommand('send_direction_vector', { payload: command }, { warnOnly: true });
}

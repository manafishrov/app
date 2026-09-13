import { setDirectionVectorStore, type DirectionVector } from '@/stores/directionVector';
import { invokeCommand } from '@/tauri/core';

const EMPTY_DIRECTION_VECTOR: DirectionVector = [0, 0, 0, 0, 0, 0, 0, 0];
const SEQUENCES_PER_MILLISECOND = 1000;
let directionSequence = Date.now() * SEQUENCES_PER_MILLISECOND;

const nextDirectionSequence = (): number => {
  directionSequence = Math.max(directionSequence + 1, Date.now() * SEQUENCES_PER_MILLISECOND);
  return directionSequence;
};

export const deactivateDirectionVector = (): Promise<void> => {
  setDirectionVectorStore(EMPTY_DIRECTION_VECTOR);
  return invokeCommand(
    'deactivate_direction_vector',
    { sequence: nextDirectionSequence() },
    { warnOnly: true },
  );
};

export const sendDirectionVector = (command: DirectionVector): Promise<void> => {
  setDirectionVectorStore(command);
  return invokeCommand(
    'send_direction_vector',
    { payload: command, sequence: nextDirectionSequence() },
    { warnOnly: true },
  );
};

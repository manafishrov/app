import { Store } from '@tanstack/react-store';

type DirectionVector = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

const directionVectorStore = new Store<DirectionVector>([
  0, 0, 0, 0, 0, 0, 0, 0,
]);

export { directionVectorStore, type DirectionVector };

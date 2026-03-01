import { createStore, reconcile } from 'solid-js/store';

type DirectionVector = [number, number, number, number, number, number, number, number];

const [directionVectorStore, setDirectionVectorStoreInternal] = createStore<DirectionVector>([
  0, 0, 0, 0, 0, 0, 0, 0,
]);

const setDirectionVectorStore = (value: DirectionVector) => {
  setDirectionVectorStoreInternal(reconcile(value));
};

export { directionVectorStore, setDirectionVectorStore, type DirectionVector };

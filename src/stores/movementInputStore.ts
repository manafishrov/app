import { Store } from '@tanstack/react-store';

type MovementInputArray = [number, number, number, number, number, number];

const movementInputStore = new Store<MovementInputArray>([0, 0, 0, 0, 0, 0]);

export { movementInputStore, type MovementInputArray };


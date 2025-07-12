import { Store } from '@tanstack/react-store';

type MovementCommand = [number, number, number, number, number, number];

const movementCommandStore = new Store<MovementCommand>([0, 0, 0, 0, 0, 0]);

export { movementCommandStore, type MovementCommand };

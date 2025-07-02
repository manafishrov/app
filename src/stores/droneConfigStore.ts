import { Store } from '@tanstack/react-store';

type Row = [number, number, number, number, number, number, number, number];

type ThrusterPinSetup = {
  identifiers: Row;
  spinDirections: Row;
};

type ThrusterAllocation = [Row, Row, Row, Row, Row, Row, Row, Row];

type DroneConfig = {
  thrusterPinSetup?: ThrusterPinSetup;
  thrusterAllocation?: ThrusterAllocation;
};

const droneConfigStore = new Store<DroneConfig>({});

export {
  droneConfigStore,
  type DroneConfig,
  type ThrusterPinSetup,
  type ThrusterAllocation,
  type Row,
};

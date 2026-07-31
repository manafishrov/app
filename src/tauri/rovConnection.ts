import { setConfig } from '@/tauri/config';
import { setRovConfig } from '@/tauri/rovConfig';

export type RovConnectionConfig = {
  ipAddress: string;
  websocketPort: number;
};

export const updateRovConnection = (connection: RovConnectionConfig): Promise<void> =>
  setRovConfig(connection).then(() =>
    setConfig({
      ipAddress: connection.ipAddress,
      webSocketPort: connection.websocketPort,
    }),
  );

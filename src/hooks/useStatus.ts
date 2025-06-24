import { type UnlistenFn, listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

type Status = {
  isConnected: boolean;
  pitch: number;
  roll: number;
  desiredPitch: number;
  desiredRoll: number;
  pressure: number;
  temperature: number;
};

function useStatus() {
  const [status, setStatus] = useState<Status>({
    isConnected: false,
    pitch: 0,
    roll: 0,
    desiredPitch: 0,
    desiredRoll: 0,
    pressure: 0,
    temperature: 0,
  });

  useEffect(() => {
    let unlistenFn: UnlistenFn;

    listen<Status>('status_update', (event) => {
      setStatus(event.payload);
    })
      .then((fn) => {
        unlistenFn = fn;
      })
      .catch((error) => {
        console.error('Failed to listen to status updates:', error);
      });

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  return { data: status };
}

export { useStatus, type Status };

import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

type Status = {
  isConnected: boolean;
  waterDetected: boolean;
  pitch: number;
  roll: number;
  desiredPitch: number;
  desiredRoll: number;
};

function useStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: async () => invoke<Status>('get_status'),
    refetchInterval: 100,
  });
}

export { useStatus, type Status };

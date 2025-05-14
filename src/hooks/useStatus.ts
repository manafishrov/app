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

const REFETCH_INTERVAL = 100;

function useStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: async () => invoke<Status>('get_status'),
    refetchInterval: REFETCH_INTERVAL,
  });
}

export { useStatus, type Status };

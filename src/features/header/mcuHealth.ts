import type { RovStatus } from '@/stores/rovStatus';

type McuHealth = 'disconnected' | 'protocolFailed' | 'initializing' | 'identityMissing' | 'ready';

const getMcuHealth = (
  status: Pick<
    RovStatus,
    'health' | 'thrusterControlReady' | 'thrusterProtocolState' | 'deviceInfo'
  >,
): McuHealth => {
  if (!status.health.mcuHealthy || status.thrusterProtocolState === 'disconnected') {
    return 'disconnected';
  }
  if (status.thrusterProtocolState === 'failed') {
    return 'protocolFailed';
  }
  if (!status.thrusterControlReady || status.thrusterProtocolState !== 'ready') {
    return 'initializing';
  }
  if (
    status.deviceInfo.mcuFirmwareVersionStatus !== 'reported' ||
    status.deviceInfo.mcuFirmwareVersion.length === 0
  ) {
    return 'identityMissing';
  }
  return 'ready';
};

export { getMcuHealth, type McuHealth };

import type { RovConfig } from '@/stores/rovConfig';

export type ResolvedMcuConfig = Pick<
  RovConfig,
  'mcuBoard' | 'thrusterProtocol' | 'dshotSpeed' | 'currentSensingMode'
>;

type McuConfigUpdate = {
  config: ResolvedMcuConfig;
  previousBoard: RovConfig['mcuBoard'];
};

type McuConfigDependencies = {
  setConfig: (config: ResolvedMcuConfig) => Promise<void>;
  flashFirmware: (board: RovConfig['mcuBoard']) => Promise<void>;
};

export const updateMcuConfig = (
  { config, previousBoard }: McuConfigUpdate,
  { setConfig, flashFirmware }: McuConfigDependencies,
): Promise<void> =>
  setConfig(config).then(() =>
    config.mcuBoard === previousBoard ? Promise.resolve() : flashFirmware(config.mcuBoard),
  );

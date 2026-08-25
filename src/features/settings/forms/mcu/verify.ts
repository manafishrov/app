import type { RovConfig } from '@/stores/rovConfig';

import type { ResolvedMcuConfig } from './update';

export const mcuConfigMatches = (expected: ResolvedMcuConfig, actual: RovConfig): boolean =>
  actual.mcuBoard === expected.mcuBoard &&
  actual.thrusterProtocol === expected.thrusterProtocol &&
  actual.dshotSpeed === expected.dshotSpeed &&
  actual.currentSensingMode === expected.currentSensingMode;

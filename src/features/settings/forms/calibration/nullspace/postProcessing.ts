import {
  COMPUTATION_EPSILON,
  DEADZONE_THRESHOLD_VALUE,
  NUM_THRUSTERS,
  ROUND_PRECISION,
} from './constants';
import { findSparsestPairByL1, gramSchmidtOrthonormalize } from './sparsity';

const normalizeToMaxOne = (vec: number[]): number[] => {
  const maxAbs = Math.max(...vec.map((val) => Math.abs(val)));
  if (maxAbs < COMPUTATION_EPSILON) {
    return vec;
  }
  return vec.map((val) => val / maxAbs);
};

const roundToTwoDecimals = (vec: number[]): number[] =>
  vec.map((val) => Math.round(val * ROUND_PRECISION) / ROUND_PRECISION);

const applyDeadzoneThreshold = (vec: number[]): number[] =>
  vec.map((val) => (Math.abs(val) < DEADZONE_THRESHOLD_VALUE ? 0 : val));

const computeSparsestPairFromBasis = (rawBasis: number[][]): number[][] => {
  const ortho = gramSchmidtOrthonormalize(rawBasis);
  if (ortho.length < rawBasis.length) {
    return rawBasis.map((vec) => normalizeToMaxOne(vec));
  }
  const [sparseA, sparseB] = findSparsestPairByL1(ortho[0] ?? [], ortho[1] ?? []);
  return [normalizeToMaxOne(sparseA), normalizeToMaxOne(sparseB)];
};

const selectSparsestVectors = (rawBasis: number[][]): number[][] => {
  if (rawBasis.length === 0) {
    return [];
  }
  const [firstVec, ...remaining] = rawBasis;
  if (remaining.length === 0) {
    return [normalizeToMaxOne(firstVec ?? [])];
  }
  const extra = remaining.slice(1);
  if (extra.length > 0) {
    return rawBasis.map((vec) => normalizeToMaxOne(vec));
  }
  return computeSparsestPairFromBasis(rawBasis);
};

const reconstructFullVectors = (
  processedVectors: number[][],
  nonZeroColIndices: number[],
): number[][] =>
  processedVectors.map((vec) => {
    const full = Array.from({ length: NUM_THRUSTERS }, () => 0);
    for (let thrIdx = 0; thrIdx < nonZeroColIndices.length; thrIdx += 1) {
      full[nonZeroColIndices[thrIdx] ?? 0] = vec[thrIdx] ?? 0;
    }
    return full;
  });

export const buildValidVectors = (
  rawBasis: number[][],
  nonZeroColIndices: number[],
): number[][] => {
  const processedVectors = selectSparsestVectors(rawBasis)
    .map((vec) => roundToTwoDecimals(vec))
    .map((vec) => applyDeadzoneThreshold(vec));
  const fullVectors = reconstructFullVectors(processedVectors, nonZeroColIndices);
  return fullVectors.filter((vec) => vec.some((val) => Math.abs(val) >= DEADZONE_THRESHOLD_VALUE));
};

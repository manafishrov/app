import { NUM_MOTION_DOFS } from './nullspace/constants';
import { buildValidVectors } from './nullspace/postProcessing';
import {
  computeRREF,
  extractNullspaceBasis,
  findNonZeroCols,
  transposeMatrix,
} from './nullspace/rref';

export type NullspaceComputationResult =
  | { type: 'success'; vectors: number[][] }
  | { type: 'no_vectors' }
  | { type: 'error'; message: string };

type NullspaceInputData = { motionMatrix: number[][]; nonZeroColIndices: number[] };

const computeMotionMatrix = (storedAllocation: number[][]): number[][] =>
  transposeMatrix(storedAllocation).slice(0, NUM_MOTION_DOFS);

const prepareNullspaceInput = (storedAllocation: number[][]): NullspaceInputData | null => {
  const motionMatrix = computeMotionMatrix(storedAllocation);
  if (motionMatrix.length === 0 || (motionMatrix[0] ?? []).length === 0) {
    return null;
  }
  const numCols = (motionMatrix[0] ?? []).length;
  const nonZeroColIndices = findNonZeroCols(motionMatrix, numCols);
  if (nonZeroColIndices.length === 0) {
    return null;
  }
  return { motionMatrix, nonZeroColIndices };
};

const computeNullspaceFromInput = (input: NullspaceInputData): NullspaceComputationResult => {
  const reducedMatrix = input.motionMatrix.map((row) =>
    input.nonZeroColIndices.map((colIdx) => row[colIdx] ?? 0),
  );
  const rrefResult = computeRREF(reducedMatrix);
  const rawBasis = extractNullspaceBasis(rrefResult, input.nonZeroColIndices.length);
  if (rawBasis.length === 0) {
    return { type: 'no_vectors' };
  }
  const validVectors = buildValidVectors(rawBasis, input.nonZeroColIndices);
  if (validVectors.length === 0) {
    return { type: 'no_vectors' };
  }
  return { type: 'success', vectors: validVectors };
};

export const computeNullspaceFromAllocation = (
  storedAllocation: number[][],
): NullspaceComputationResult => {
  try {
    const input = prepareNullspaceInput(storedAllocation);
    if (input === null) {
      return { type: 'no_vectors' };
    }
    return computeNullspaceFromInput(input);
  } catch (error: unknown) {
    return { type: 'error', message: String(error) };
  }
};

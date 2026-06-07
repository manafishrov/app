const COMPUTATION_EPSILON = 1e-9;
const DEADZONE_THRESHOLD_VALUE = 0.2;
const ROUND_PRECISION = 100;
const NUM_THRUSTERS = 8;
const NUM_MOTION_DOFS = 6;
const L1_SCAN_STEPS = 2000;

const transposeMatrix = (matrix: number[][]): number[][] => {
  if (matrix.length === 0) {
    return [];
  }
  const cols = (matrix[0] ?? []).length;
  return Array.from({ length: cols }, (_, colIndex) => matrix.map((row) => row[colIndex] ?? 0));
};

type RREFResult = { rref: number[][]; pivotCols: number[] };

type RREFState = {
  matrix: number[][];
  pivotCols: number[];
  pivotRowRef: { value: number };
  numCols: number;
};

const findPivotRow = (
  state: RREFState,
  fromRow: number,
  col: number,
): { maxRow: number; maxVal: number } => {
  let maxRow = fromRow;
  let maxVal = Math.abs((state.matrix[fromRow] ?? [])[col] ?? 0);
  for (let rowIdx = fromRow + 1; rowIdx < state.matrix.length; rowIdx += 1) {
    const val = Math.abs((state.matrix[rowIdx] ?? [])[col] ?? 0);
    if (val > maxVal) {
      maxVal = val;
      maxRow = rowIdx;
    }
  }
  return { maxRow, maxVal };
};

const swapRows = (state: RREFState, rowA: number, rowB: number): void => {
  const temp = state.matrix[rowA] ?? [];
  state.matrix[rowA] = state.matrix[rowB] ?? [];
  state.matrix[rowB] = temp;
};

const normalizeRow = (state: RREFState, rowIdx: number, col: number): void => {
  const row = state.matrix[rowIdx] ?? [];
  const pivot = row[col] ?? 1;
  for (let colIdx = 0; colIdx < state.numCols; colIdx += 1) {
    row[colIdx] = (row[colIdx] ?? 0) / pivot;
  }
};

const eliminateColumn = (state: RREFState, pivotRowIdx: number, col: number): void => {
  const pivotRow = state.matrix[pivotRowIdx] ?? [];
  for (let rowIdx = 0; rowIdx < state.matrix.length; rowIdx += 1) {
    if (rowIdx !== pivotRowIdx) {
      const currentRow = state.matrix[rowIdx] ?? [];
      const factor = currentRow[col] ?? 0;
      if (Math.abs(factor) >= COMPUTATION_EPSILON) {
        for (let colIdx = 0; colIdx < state.numCols; colIdx += 1) {
          currentRow[colIdx] = (currentRow[colIdx] ?? 0) - factor * (pivotRow[colIdx] ?? 0);
        }
      }
    }
  }
};

const processColumnPivot = (state: RREFState, col: number): void => {
  const { maxRow, maxVal } = findPivotRow(state, state.pivotRowRef.value, col);
  if (maxVal >= COMPUTATION_EPSILON) {
    swapRows(state, state.pivotRowRef.value, maxRow);
    normalizeRow(state, state.pivotRowRef.value, col);
    eliminateColumn(state, state.pivotRowRef.value, col);
    state.pivotCols.push(col);
    state.pivotRowRef.value += 1;
  }
};

const computeRREF = (inputMatrix: number[][]): RREFResult => {
  const rows = inputMatrix.length;
  if (rows === 0) {
    return { rref: [], pivotCols: [] };
  }
  const state: RREFState = {
    matrix: inputMatrix.map((row) => [...row]),
    pivotCols: [],
    pivotRowRef: { value: 0 },
    numCols: (inputMatrix[0] ?? []).length,
  };
  for (let col = 0; col < state.numCols && state.pivotRowRef.value < rows; col += 1) {
    processColumnPivot(state, col);
  }
  return { rref: state.matrix, pivotCols: state.pivotCols };
};

const extractNullspaceBasis = (rrefResult: RREFResult, numCols: number): number[][] => {
  const { rref, pivotCols } = rrefResult;
  const freeCols: number[] = [];
  for (let freeIdx = 0; freeIdx < numCols; freeIdx += 1) {
    if (!pivotCols.includes(freeIdx)) {
      freeCols.push(freeIdx);
    }
  }
  if (freeCols.length === 0) {
    return [];
  }
  return freeCols.map((freeCol) => {
    const vec = Array.from({ length: numCols }, () => 0);
    vec[freeCol] = 1;
    for (let pivotIdx = 0; pivotIdx < pivotCols.length; pivotIdx += 1) {
      const pc = pivotCols[pivotIdx] ?? 0;
      vec[pc] = -((rref[pivotIdx] ?? [])[freeCol] ?? 0);
    }
    return vec;
  });
};

const vectorDot = (vecA: number[], vecB: number[]): number =>
  vecA.reduce((sum, val, idx) => sum + val * (vecB[idx] ?? 0), 0);
const vectorNorm = (vec: number[]): number =>
  Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));

const projectOnBasis = (vec: number[], basisVectors: number[][]): number[] => {
  let proj = [...vec];
  for (const basis of basisVectors) {
    const dot = vectorDot(proj, basis);
    proj = proj.map((val, idx) => val - dot * (basis[idx] ?? 0));
  }
  return proj;
};

const gramSchmidtOrthonormalize = (vectors: number[][]): number[][] => {
  const result: number[][] = [];
  for (const vec of vectors) {
    const proj = projectOnBasis(vec, result);
    const norm = vectorNorm(proj);
    if (norm >= COMPUTATION_EPSILON) {
      result.push(proj.map((val) => val / norm));
    }
  }
  return result;
};

const computeL1AtAngle = (basisU: number[], basisV: number[], theta: number): number => {
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  return basisU.reduce(
    (sum, val, thrIdx) => sum + Math.abs(cosTheta * val + sinTheta * (basisV[thrIdx] ?? 0)),
    0,
  );
};

const findBestAngle = (basisU: number[], basisV: number[]): number => {
  let minL1 = Infinity;
  let bestAngle = 0;
  for (let step = 0; step < L1_SCAN_STEPS; step += 1) {
    const theta = (Math.PI * step) / L1_SCAN_STEPS;
    const l1 = computeL1AtAngle(basisU, basisV, theta);
    if (l1 < minL1) {
      minL1 = l1;
      bestAngle = theta;
    }
  }
  return bestAngle;
};

const findSparsestPairByL1 = (basisU: number[], basisV: number[]): [number[], number[]] => {
  const bestAngle = findBestAngle(basisU, basisV);
  const cosAngle = Math.cos(bestAngle);
  const sinAngle = Math.sin(bestAngle);
  return [
    basisU.map((val, thrIdx) => cosAngle * val + sinAngle * (basisV[thrIdx] ?? 0)),
    basisU.map((val, thrIdx) => -sinAngle * val + cosAngle * (basisV[thrIdx] ?? 0)),
  ];
};

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

export type NullspaceComputationResult =
  | { type: 'success'; vectors: number[][] }
  | { type: 'no_vectors' }
  | { type: 'error'; message: string };

const findNonZeroCols = (matrix: number[][], numCols: number): number[] => {
  const nonZeroColIndices: number[] = [];
  for (let colIdx = 0; colIdx < numCols; colIdx += 1) {
    const isAllZero = matrix.every((row) => Math.abs(row[colIdx] ?? 0) < COMPUTATION_EPSILON);
    if (!isAllZero) {
      nonZeroColIndices.push(colIdx);
    }
  }
  return nonZeroColIndices;
};

const computeMotionMatrix = (storedAllocation: number[][]): number[][] =>
  transposeMatrix(storedAllocation).slice(0, NUM_MOTION_DOFS);

const buildValidVectors = (rawBasis: number[][], nonZeroColIndices: number[]): number[][] => {
  const processedVectors = selectSparsestVectors(rawBasis)
    .map((vec) => roundToTwoDecimals(vec))
    .map((vec) => applyDeadzoneThreshold(vec));
  const fullVectors = reconstructFullVectors(processedVectors, nonZeroColIndices);
  return fullVectors.filter((vec) => vec.some((val) => Math.abs(val) >= DEADZONE_THRESHOLD_VALUE));
};

type NullspaceInputData = { motionMatrix: number[][]; nonZeroColIndices: number[] };

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

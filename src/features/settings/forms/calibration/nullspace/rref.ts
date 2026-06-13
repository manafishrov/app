import { COMPUTATION_EPSILON } from './constants';

export type RREFResult = { rref: number[][]; pivotCols: number[] };

type RREFState = {
  matrix: number[][];
  pivotCols: number[];
  pivotRowRef: { value: number };
  numCols: number;
};

export const transposeMatrix = (matrix: number[][]): number[][] => {
  if (matrix.length === 0) {
    return [];
  }
  const cols = (matrix[0] ?? []).length;
  return Array.from({ length: cols }, (_, colIndex) => matrix.map((row) => row[colIndex] ?? 0));
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

export const computeRREF = (inputMatrix: number[][]): RREFResult => {
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

export const extractNullspaceBasis = (rrefResult: RREFResult, numCols: number): number[][] => {
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
      const pivotCol = pivotCols[pivotIdx] ?? 0;
      vec[pivotCol] = -((rref[pivotIdx] ?? [])[freeCol] ?? 0);
    }
    return vec;
  });
};

export const findNonZeroCols = (matrix: number[][], numCols: number): number[] => {
  const nonZeroColIndices: number[] = [];
  for (let colIdx = 0; colIdx < numCols; colIdx += 1) {
    const isAllZero = matrix.every((row) => Math.abs(row[colIdx] ?? 0) < COMPUTATION_EPSILON);
    if (!isAllZero) {
      nonZeroColIndices.push(colIdx);
    }
  }
  return nonZeroColIndices;
};

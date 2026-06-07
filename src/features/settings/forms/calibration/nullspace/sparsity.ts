import { COMPUTATION_EPSILON, L1_SCAN_STEPS } from './constants';

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

export const gramSchmidtOrthonormalize = (vectors: number[][]): number[][] => {
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

export const findSparsestPairByL1 = (basisU: number[], basisV: number[]): [number[], number[]] => {
  const bestAngle = findBestAngle(basisU, basisV);
  const cosAngle = Math.cos(bestAngle);
  const sinAngle = Math.sin(bestAngle);
  return [
    basisU.map((val, thrIdx) => cosAngle * val + sinAngle * (basisV[thrIdx] ?? 0)),
    basisU.map((val, thrIdx) => -sinAngle * val + cosAngle * (basisV[thrIdx] ?? 0)),
  ];
};

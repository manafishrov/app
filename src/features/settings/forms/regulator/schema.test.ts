import { expect, it } from 'vitest';

import { createFormSchema, REGULATOR_FORM_DEFAULT_VALUES } from './schema';

const OUT_OF_RANGE_TURN_RATE = 400;
const OUT_OF_RANGE_DEPTH_RATE = 4;

it('reports out-of-range rates on the rate field that shows them', () => {
  const result = createFormSchema().safeParse({
    ...REGULATOR_FORM_DEFAULT_VALUES,
    pitch: { ...REGULATOR_FORM_DEFAULT_VALUES.pitch, rate: [OUT_OF_RANGE_TURN_RATE] },
    depth: { ...REGULATOR_FORM_DEFAULT_VALUES.depth, rate: [OUT_OF_RANGE_DEPTH_RATE] },
  });

  const issues = result.success ? [] : result.error.issues;
  expect(issues.map(({ path, message }) => ({ path, message }))).toEqual([
    { path: ['pitch', 'rate'], message: 'Must be at most 360' },
    { path: ['depth', 'rate'], message: 'Must be at most 3' },
  ]);
});

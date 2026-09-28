import { expect, it } from 'vitest';

import { buildAgentInstructions } from './instructions';

it('includes shared instructions and available declarations without live values or extension internals', () => {
  const output = buildAgentInstructions({
    version: 1,
    readings: [
      {
        id: 'rov.waterTemperature',
        name: 'Water temperature',
        valueType: 'number',
        extensionId: null,
      },
    ],
    actions: [],
    extensions: [],
    samples: [
      { id: 'rov.waterTemperature', value: 'PRIVATE_SAMPLE_MARKER', sequence: 1, timestamp: 0 },
    ],
  });
  expect(output).toContain('rov.waterTemperature');
  expect(output).toContain('from `manafish_sdk`');
  expect(output).not.toContain('PRIVATE_SAMPLE_MARKER');
  expect(output).toContain('ctx.log_csv');
});

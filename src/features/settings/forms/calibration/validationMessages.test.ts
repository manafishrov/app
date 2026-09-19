import { describe, expect, it } from 'vitest';

import { validationMessages } from './validationMessages';

describe('validationMessages', () => {
  it('preserves string and schema validation messages in order', () => {
    const errors = ['Required', { message: 'Outside range', path: ['nullspaceVectors', 0] }];
    expect(validationMessages(errors)).toEqual(['Required', 'Outside range']);
  });

  it('ignores entries FieldError cannot display', () => {
    const optionalError: { message?: string } = {};
    expect(validationMessages([optionalError.message, null, {}, { message: 1 }, false])).toEqual(
      [],
    );
  });

  it('preserves empty and repeated messages for FieldError to handle', () => {
    expect(validationMessages(['', { message: 'Repeated' }, 'Repeated'])).toEqual([
      '',
      'Repeated',
      'Repeated',
    ]);
  });
});

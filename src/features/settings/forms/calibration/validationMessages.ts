// Match FieldError's message handling without passing opaque form metadata to it.
export const validationMessages = (errors: readonly unknown[]): string[] =>
  errors.flatMap((error): string[] => {
    if (typeof error === 'string') {
      return [error];
    }
    if (
      error !== null &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return [error.message];
    }
    return [];
  });

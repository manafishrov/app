import { z } from 'zod';

import * as m from '@/paraglide/messages';
import { requestCapability } from '@/tauri/capabilities';

export const MAX_SOURCE_BYTES = 262_144;
const sendSource = (operation: string, source: string): Promise<unknown> => {
  if (new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES) {
    return Promise.reject(new Error(m.custom_action_scripts_source_too_large()));
  }
  return requestCapability(operation, { source });
};

const declarationSchema = z.object({ id: z.string(), name: z.string() });
const validationSchema = z.object({
  manifest: z.object({ id: z.string(), name: z.string() }),
  readings: z.array(declarationSchema),
  actions: z.array(declarationSchema),
  warnings: z.array(z.string()),
});
export type CustomActionValidation = z.infer<typeof validationSchema>;

const csvFileSchema = z.object({
  name: z.string(),
  rows: z.number().int().nonnegative(),
  columns: z.number().int().nonnegative(),
  size: z.number().int().nonnegative(),
});
export type CsvFile = z.infer<typeof csvFileSchema>;

export const validateCustomAction = (source: string): Promise<CustomActionValidation> =>
  sendSource('customAction.validate', source).then((result) => validationSchema.parse(result));

export const installCustomAction = (source: string): Promise<unknown> =>
  sendSource('customAction.install', source);

export const readCustomAction = (id: string): Promise<string> =>
  requestCapability('customAction.source', { id }).then(
    (result) => z.object({ source: z.string() }).parse(result).source,
  );

export const listCsvFiles = (): Promise<CsvFile[]> =>
  requestCapability('csv.list', {}).then((result) => z.array(csvFileSchema).parse(result));

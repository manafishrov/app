import { z } from 'zod';

export const capabilityValueSchema = z.json();
export type CapabilityValue = z.infer<typeof capabilityValueSchema>;
export const actionModeSchema = z.enum(['once', 'hold', 'toggle']);
export type ActionMode = z.infer<typeof actionModeSchema>;
export type ActionPhase = 'press' | 'release' | 'stop';

export const readingDescriptorSchema = z.object({
  id: z.string(),
  name: z.string(),
  valueType: z.enum(['boolean', 'number', 'string', 'numberArray', 'json']),
  unit: z.string().nullish(),
  widget: z.string().nullish(),
  staleAfterMs: z.number().positive().nullish(),
  extensionId: z.string().nullable(),
});
export type ReadingDescriptor = z.infer<typeof readingDescriptorSchema>;

export const actionDescriptorSchema = z.object({
  id: z.string(),
  name: z.string(),
  inputType: z.enum(['none', 'boolean', 'number', 'numberArray', 'string']),
  modes: z.array(actionModeSchema),
  mode: actionModeSchema,
  intervalMs: z.number().nonnegative(),
  extensionId: z.string().nullable(),
});
export type ActionDescriptor = z.infer<typeof actionDescriptorSchema>;

export const extensionDescriptorSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  status: z.enum(['stopped', 'running', 'error']),
  error: z.string().nullish(),
});
export type ExtensionDescriptor = z.infer<typeof extensionDescriptorSchema>;

export const readingSampleSchema = z.object({
  id: z.string(),
  value: capabilityValueSchema,
  sequence: z.number().int().nonnegative(),
  timestamp: z.number(),
  ageMs: z.number().nonnegative().optional(),
});
export type ReadingSample = z.infer<typeof readingSampleSchema>;
export const capabilitySamplesSchema = z.object({
  version: z.literal(1),
  samples: z.array(readingSampleSchema),
});
export const capabilityCatalogSchema = z.object({
  version: z.literal(1),
  readings: z.array(readingDescriptorSchema),
  actions: z.array(actionDescriptorSchema),
  extensions: z.array(extensionDescriptorSchema),
  samples: z.array(readingSampleSchema).optional(),
});
export type CapabilityCatalog = z.infer<typeof capabilityCatalogSchema>;

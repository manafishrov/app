import { z } from 'zod';

import type { ReadingSample } from '@/stores/capabilityTypes';

import { logWarn } from '@/lib/log';
import { rovStatusStore, setRovStatusStore } from '@/stores/rovStatus';
import { rovTelemetryStore, setRovTelemetryStore } from '@/stores/rovTelemetry';

const eightNumbers = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
]);
const nullableNumber = z.number().nullable();
const nullableString = z.string().nullable();
const telemetrySchema = z.object({
  pitch: z.number(),
  roll: z.number(),
  yaw: z.number(),
  depth: z.number(),
  desiredPitch: z.number(),
  desiredRoll: z.number(),
  desiredYaw: z.number(),
  desiredDepth: z.number(),
  waterTemperature: z.number(),
  electronicsTemperature: z.number(),
  thrusterRpms: eightNumbers,
  thrusterSignalQualities: z.tuple([
    nullableNumber,
    nullableNumber,
    nullableNumber,
    nullableNumber,
    nullableNumber,
    nullableNumber,
    nullableNumber,
    nullableNumber,
  ]),
  workIndicatorPercentage: z.number(),
});
const statusSchema = z.object({
  autoStabilization: z.boolean(),
  depthHold: z.boolean(),
  batteryPercentage: z.number(),
  currentDraw: nullableNumber,
  piUndervoltage: z.boolean(),
  thrusterControlReady: z.boolean(),
  thrusterProtocolState: z.enum(['disconnected', 'synchronizing', 'applying', 'ready', 'failed']),
  thrusterProtocolError: nullableString,
  health: z.object({
    imuHealthy: z.boolean(),
    pressureSensorHealthy: z.boolean(),
    mcuHealthy: z.boolean(),
  }),
  deviceInfo: z.object({
    mcuFirmwareVersion: z.string(),
    mcuFirmwareVersionStatus: z.enum(['querying', 'reported', 'notReported']),
    escFirmwareVersions: z.tuple([
      nullableString,
      nullableString,
      nullableString,
      nullableString,
      nullableString,
      nullableString,
      nullableString,
      nullableString,
    ]),
    escFirmwareVersionStatus: z.enum(['discovering', 'reported', 'notReported']),
  }),
  escFirmwareUpdate: z.object({
    active: z.boolean(),
    stage: z.enum([
      'idle',
      'preflight',
      'uploading',
      'programming',
      'awaitingTelemetry',
      'succeeded',
      'unconfirmed',
      'versionMismatch',
      'failed',
    ]),
    progress: z.number(),
    currentEsc: nullableNumber,
    targetVersion: nullableString,
    error: nullableString,
    recoveryRequired: z.boolean(),
  }),
});

const touches = (schema: z.ZodObject, values: Record<string, unknown>): boolean =>
  Object.keys(values).some((key) => Object.hasOwn(schema.shape, key));

const projectTelemetry = (values: Record<string, unknown>): void => {
  const telemetry = telemetrySchema.safeParse({ ...rovTelemetryStore, ...values });
  if (telemetry.success) {
    setRovTelemetryStore(telemetry.data);
  } else {
    logWarn('Invalid built-in telemetry reading', telemetry.error.message);
  }
};

const projectStatus = (values: Record<string, unknown>): void => {
  const status = statusSchema.safeParse({ ...rovStatusStore, ...values });
  if (status.success) {
    setRovStatusStore(status.data);
  } else {
    logWarn('Invalid built-in status reading', status.error.message);
  }
};

// Existing instruments consume typed views of the same samples as custom-action widgets.
// Only a group with a sample in this batch is validated and reconciled again.
export const projectBuiltinSamples = (samples: ReadingSample[]): void => {
  const values = Object.fromEntries(
    samples
      .filter((sample) => sample.id.startsWith('rov.'))
      .map((sample) => [sample.id.slice('rov.'.length), sample.value]),
  );
  if (touches(telemetrySchema, values)) {
    projectTelemetry(values);
  }
  if (touches(statusSchema, values)) {
    projectStatus(values);
  }
};

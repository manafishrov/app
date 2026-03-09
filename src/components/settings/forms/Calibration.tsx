import { createListCollection } from '@ark-ui/solid/collection';
import { Button } from '@manafishrov/ui/button';
import { FieldLegend, Fieldset } from '@manafishrov/ui/field';
import { useAppForm } from '@manafishrov/ui/form';
import {
  Select,
  SelectContent,
  SelectControl,
  SelectIndicator,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@manafishrov/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@manafishrov/ui/table';
import { toast } from '@manafishrov/ui/toaster';
import { Tooltip, TooltipContent, TooltipTrigger } from '@manafishrov/ui/tooltip';
import { invoke } from '@tauri-apps/api/core';
import { type Component, type JSX, For, createSignal } from 'solid-js';
import { z } from 'zod';

import { ThrusterRpm } from '@/components/controls/ThrusterRpm';
import { logError } from '@/lib/log';
import {
  type Row,
  type ThrusterAllocation,
  type ThrusterPinSetup,
  rovConfigStore,
} from '@/stores/rovConfig';
import { rovTelemetryStore } from '@/stores/rovTelemetry';
import { setRovConfig } from '@/tauri';

const THRUSTER_INDICES = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const THRUSTER_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const PIN_NUMBERS = [6, 7, 8, 9, 18, 19, 20, 21] as const;
const ROW_LABELS = [
  'Surge',
  'Sway',
  'Heave',
  'Pitch',
  'Yaw',
  'Roll',
  'Action 1',
  'Action 2',
] as const;
const ROW_LABEL_TOOLTIPS = [
  'Thrusters to activate to move forward.',
  'Thrusters to activate to move right.',
  'Thrusters to activate to move upwards.',
  'Thrusters to activate to pitch up.',
  'Thrusters to activate to yaw right.',
  'Thrusters to activate to roll right.',
  'Thrusters to activate for action 1 (custom or auxiliary function).',
  'Thrusters to activate for action 2 (custom or auxiliary function).',
] as const;

const identifierCollection = createListCollection<{ value: string; label: string }>({
  items: THRUSTER_INDICES.map((index) => ({
    value: String(index),
    label: String(index + 1),
  })),
});

const spinDirectionCollection = createListCollection<{ value: string; label: string }>({
  items: [
    { value: '1', label: 'Normal' },
    { value: '-1', label: 'Reversed' },
  ],
});

const identifierSchema = z.enum(['0', '1', '2', '3', '4', '5', '6', '7']);
const spinDirectionSchema = z.enum(['1', '-1']);

const formSchema = z.object({
  thrusterPinSetup: z.object({
    identifiers: z.array(identifierSchema).length(8),
    spinDirections: z.array(spinDirectionSchema).length(8),
  }),
  thrusterAllocation: z.array(z.array(z.number().min(-1).max(1)).length(8)).length(8),
});

const transpose = (matrix: number[][]): number[][] => {
  const [firstRow] = matrix;
  if (!firstRow) {
    return [];
  }

  return firstRow.map((_, colIndex) =>
    matrix.map((row) => {
      const value = row[colIndex];
      return value === undefined ? 0 : value;
    }),
  );
};

const clampAllocationValue = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const clampedValue = Math.max(-1, Math.min(1, value));
  return Math.round(clampedValue * 100) / 100;
};

const toRow = (values: number[] | undefined, fallback: Row): Row => [
  clampAllocationValue(values?.[0] ?? fallback[0]),
  clampAllocationValue(values?.[1] ?? fallback[1]),
  clampAllocationValue(values?.[2] ?? fallback[2]),
  clampAllocationValue(values?.[3] ?? fallback[3]),
  clampAllocationValue(values?.[4] ?? fallback[4]),
  clampAllocationValue(values?.[5] ?? fallback[5]),
  clampAllocationValue(values?.[6] ?? fallback[6]),
  clampAllocationValue(values?.[7] ?? fallback[7]),
];

const parseIdentifier = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(7, parsed));
};

const parseSpinDirection = (value: string | undefined, fallback: number): number => {
  if (value === '-1') {
    return -1;
  }

  if (value === '1') {
    return 1;
  }

  return fallback === -1 ? -1 : 1;
};

const toIdentifierValue = (value: number): z.infer<typeof identifierSchema> => {
  if (value <= 0) {
    return '0';
  }
  if (value === 1) {
    return '1';
  }
  if (value === 2) {
    return '2';
  }
  if (value === 3) {
    return '3';
  }
  if (value === 4) {
    return '4';
  }
  if (value === 5) {
    return '5';
  }
  if (value === 6) {
    return '6';
  }

  return '7';
};

const toSpinDirectionValue = (value: number): z.infer<typeof spinDirectionSchema> =>
  value === -1 ? '-1' : '1';

const isIdentifierValue = (value: string): value is z.infer<typeof identifierSchema> =>
  value === '0' ||
  value === '1' ||
  value === '2' ||
  value === '3' ||
  value === '4' ||
  value === '5' ||
  value === '6' ||
  value === '7';

const isSpinDirectionValue = (value: string): value is z.infer<typeof spinDirectionSchema> =>
  value === '1' || value === '-1';

type FormValues = z.infer<typeof formSchema>;

export const Calibration: Component = () => {
  const [testDisabled, setTestDisabled] = createSignal<boolean[]>(
    Array(PIN_NUMBERS.length).fill(false),
  );

  const defaultAllocationRows = transpose(rovConfigStore.thrusterAllocation);

  const form = useAppForm(() => ({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      thrusterPinSetup: {
        identifiers: rovConfigStore.thrusterPinSetup.identifiers.map((value) =>
          toIdentifierValue(value),
        ),
        spinDirections: rovConfigStore.thrusterPinSetup.spinDirections.map((value) =>
          toSpinDirectionValue(value),
        ),
      },
      thrusterAllocation: defaultAllocationRows,
    } satisfies FormValues,
    onSubmit: ({ value }) => {
      const currentPinSetup = rovConfigStore.thrusterPinSetup;
      const currentAllocation = rovConfigStore.thrusterAllocation;

      const thrusterPinSetup: ThrusterPinSetup = {
        identifiers: [
          parseIdentifier(value.thrusterPinSetup.identifiers[0], currentPinSetup.identifiers[0]),
          parseIdentifier(value.thrusterPinSetup.identifiers[1], currentPinSetup.identifiers[1]),
          parseIdentifier(value.thrusterPinSetup.identifiers[2], currentPinSetup.identifiers[2]),
          parseIdentifier(value.thrusterPinSetup.identifiers[3], currentPinSetup.identifiers[3]),
          parseIdentifier(value.thrusterPinSetup.identifiers[4], currentPinSetup.identifiers[4]),
          parseIdentifier(value.thrusterPinSetup.identifiers[5], currentPinSetup.identifiers[5]),
          parseIdentifier(value.thrusterPinSetup.identifiers[6], currentPinSetup.identifiers[6]),
          parseIdentifier(value.thrusterPinSetup.identifiers[7], currentPinSetup.identifiers[7]),
        ],
        spinDirections: [
          parseSpinDirection(
            value.thrusterPinSetup.spinDirections[0],
            currentPinSetup.spinDirections[0],
          ),
          parseSpinDirection(
            value.thrusterPinSetup.spinDirections[1],
            currentPinSetup.spinDirections[1],
          ),
          parseSpinDirection(
            value.thrusterPinSetup.spinDirections[2],
            currentPinSetup.spinDirections[2],
          ),
          parseSpinDirection(
            value.thrusterPinSetup.spinDirections[3],
            currentPinSetup.spinDirections[3],
          ),
          parseSpinDirection(
            value.thrusterPinSetup.spinDirections[4],
            currentPinSetup.spinDirections[4],
          ),
          parseSpinDirection(
            value.thrusterPinSetup.spinDirections[5],
            currentPinSetup.spinDirections[5],
          ),
          parseSpinDirection(
            value.thrusterPinSetup.spinDirections[6],
            currentPinSetup.spinDirections[6],
          ),
          parseSpinDirection(
            value.thrusterPinSetup.spinDirections[7],
            currentPinSetup.spinDirections[7],
          ),
        ],
      };

      const normalizedDisplayRows: [Row, Row, Row, Row, Row, Row, Row, Row] = [
        toRow(value.thrusterAllocation[0], toRow(defaultAllocationRows[0], currentAllocation[0])),
        toRow(value.thrusterAllocation[1], toRow(defaultAllocationRows[1], currentAllocation[1])),
        toRow(value.thrusterAllocation[2], toRow(defaultAllocationRows[2], currentAllocation[2])),
        toRow(value.thrusterAllocation[3], toRow(defaultAllocationRows[3], currentAllocation[3])),
        toRow(value.thrusterAllocation[4], toRow(defaultAllocationRows[4], currentAllocation[4])),
        toRow(value.thrusterAllocation[5], toRow(defaultAllocationRows[5], currentAllocation[5])),
        toRow(value.thrusterAllocation[6], toRow(defaultAllocationRows[6], currentAllocation[6])),
        toRow(value.thrusterAllocation[7], toRow(defaultAllocationRows[7], currentAllocation[7])),
      ];

      const allocationByThruster = transpose(normalizedDisplayRows);

      const thrusterAllocation: ThrusterAllocation = [
        toRow(allocationByThruster[0], currentAllocation[0]),
        toRow(allocationByThruster[1], currentAllocation[1]),
        toRow(allocationByThruster[2], currentAllocation[2]),
        toRow(allocationByThruster[3], currentAllocation[3]),
        toRow(allocationByThruster[4], currentAllocation[4]),
        toRow(allocationByThruster[5], currentAllocation[5]),
        toRow(allocationByThruster[6], currentAllocation[6]),
        toRow(allocationByThruster[7], currentAllocation[7]),
      ];

      return setRovConfig({
        thrusterPinSetup,
        thrusterAllocation,
      });
    },
  }));

  const handleTestThruster = async (index: number): Promise<void> => {
    setTestDisabled((previous) => {
      const next = [...previous];
      next[index] = true;
      return next;
    });

    await invoke('start_thruster_test', { payload: index }).catch((error) => {
      logError('Failed to start thruster test:', error);
      toast.create({ title: 'Failed to start thruster test', type: 'error' });
    });

    setTimeout(() => {
      setTestDisabled((previous) => {
        const next = [...previous];
        next[index] = false;
        return next;
      });
    }, 2000);
  };

  const renderIdentifierField = (index: number) => (
    <form.AppField name={`thrusterPinSetup.identifiers[${index}]`}>
      {(field) => (
        <Select
          class='w-16'
          collection={identifierCollection}
          value={[field().state.value]}
          onValueChange={(details) => {
            const [nextValue] = details.value;
            if (nextValue !== undefined && isIdentifierValue(nextValue)) {
              field().handleChange(nextValue);
            }
          }}
          onBlur={() => {
            field().handleBlur();
          }}
          invalid={field().state.meta.errors.length > 0}
        >
          <SelectControl>
            <SelectTrigger>
              <SelectValue />
              <SelectIndicator />
            </SelectTrigger>
          </SelectControl>
          <SelectPositioner>
            <SelectContent>
              <For each={identifierCollection.items}>
                {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
              </For>
            </SelectContent>
          </SelectPositioner>
        </Select>
      )}
    </form.AppField>
  );

  const renderSpinDirectionField = (index: number) => (
    <form.AppField name={`thrusterPinSetup.spinDirections[${index}]`}>
      {(field) => (
        <Select
          class='w-28'
          collection={spinDirectionCollection}
          value={[field().state.value]}
          onValueChange={(details) => {
            const [nextValue] = details.value;
            if (nextValue !== undefined && isSpinDirectionValue(nextValue)) {
              field().handleChange(nextValue);
            }
          }}
          onBlur={() => {
            field().handleBlur();
          }}
          invalid={field().state.meta.errors.length > 0}
        >
          <SelectControl>
            <SelectTrigger>
              <SelectValue />
              <SelectIndicator />
            </SelectTrigger>
          </SelectControl>
          <SelectPositioner>
            <SelectContent>
              <For each={spinDirectionCollection.items}>
                {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
              </For>
            </SelectContent>
          </SelectPositioner>
        </Select>
      )}
    </form.AppField>
  );

  const renderAllocationField = (rowIndex: number, columnIndex: number): JSX.Element => {
    const AppField = form.AppField;

    return (
      <AppField name={`thrusterAllocation[${rowIndex}][${columnIndex}]`}>
        {(field) => (
          <field.NumberInputField
            class='text-center px-1'
            inputMode='decimal'
            showTriggers={false}
            min={-1}
            max={1}
            step={0.01}
            allowOverflow={false}
            clampValueOnBlur
          />
        )}
      </AppField>
    );
  };

  return (
    <form.AppForm>
      <form.Form>
        <Fieldset>
          <FieldLegend>Thruster pin setup</FieldLegend>
          <p class='text-muted-foreground mb-4 text-sm'>
            Configure each microcontroller pin and test it to identify the matching thruster. Set
            spin direction so each thruster rotates forward for your propeller type.
          </p>
          <Table class='border'>
            <TableHeader>
              <TableRow>
                <TableHead class='text-center'>
                  <Tooltip>
                    <TooltipTrigger>Pin</TooltipTrigger>
                    <TooltipContent>
                      <p>The general-purpose pin on the microcontroller that the thruster uses.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger>Identifier</TooltipTrigger>
                    <TooltipContent>
                      <p>Identifier used by thruster allocation for this physical thruster.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger>Spin Direction</TooltipTrigger>
                    <TooltipContent>
                      <p>The default propeller direction for this thruster.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger>Test</TooltipTrigger>
                    <TooltipContent>
                      <p>Run a short low-speed spin test on the selected pin.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead class='text-right'>
                  <Tooltip>
                    <TooltipTrigger>RPM</TooltipTrigger>
                    <TooltipContent>
                      <p>Live revolutions per minute from telemetry.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={PIN_NUMBERS}>
                {(pin, index) => (
                  <TableRow>
                    <TableCell class='text-center'>GP{pin}</TableCell>
                    <TableCell>{renderIdentifierField(index())}</TableCell>
                    <TableCell>{renderSpinDirectionField(index())}</TableCell>
                    <TableCell>
                      <Button
                        type='button'
                        variant='outline'
                        disabled={testDisabled()[index()] ?? false}
                        onClick={() => {
                          handleTestThruster(index());
                        }}
                      >
                        Test
                      </Button>
                    </TableCell>
                    <TableCell class='w-24'>
                      <div class='flex items-center justify-end gap-2'>
                        <ThrusterRpm rpm={rovTelemetryStore.thrusterRpms[index()] ?? 0} />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </Fieldset>

        <Fieldset>
          <FieldLegend>Thruster allocation</FieldLegend>
          <p class='text-muted-foreground mb-4 text-sm'>
            Tune how each thruster contributes to each movement axis. Use values between -1 and 1,
            where positive is forward thrust, negative is reverse thrust, and 0 disables thrust.
          </p>
          <Table class='border'>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger>Identifier</TooltipTrigger>
                    <TooltipContent>
                      <p>Identifier for each thruster, defined in thruster pin setup.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <For each={THRUSTER_COLUMNS}>
                  {(identifier) => (
                    <TableHead class='text-center' aria-label={`Thruster ${identifier}`}>
                      {identifier}
                    </TableHead>
                  )}
                </For>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={ROW_LABELS}>
                {(rowLabel, rowIndex) => (
                  <TableRow>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger>{rowLabel}</TooltipTrigger>
                        <TooltipContent>
                          <p>{ROW_LABEL_TOOLTIPS[rowIndex()]}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <For each={THRUSTER_COLUMNS}>
                      {(_, columnIndex) => (
                        <TableCell class='w-20'>
                          {renderAllocationField(rowIndex(), columnIndex())}
                        </TableCell>
                      )}
                    </For>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </Fieldset>

        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};

import { createListCollection } from '@ark-ui/solid/collection';
import { Button } from '@manafishrov/ui/button';
import { FieldLegend, Fieldset } from '@manafishrov/ui/field';
import { useAppForm } from '@manafishrov/ui/form';
import { Menu, MenuContent, MenuItem, MenuPositioner, MenuTrigger } from '@manafishrov/ui/menu';
import {
  Select,
  SelectContent,
  SelectControl,
  SelectIndicator,
  SelectItem,
  SelectList,
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
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import { invoke } from '@tauri-apps/api/core';
import { type Component, type JSX, For, createSignal } from 'solid-js';
import { Portal } from 'solid-js/web';
import { z } from 'zod';
import RestartAltIcon from '~icons/material-symbols/restart-alt';

import { ThrusterRpm } from '@/components/ThrusterRpm';
import { logError } from '@/lib/log';
import { THRUSTER_PRESETS, type ThrusterPresetRow } from '@/lib/thrusterPresets';
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

const PRESET_ROW_KEYS: (keyof ThrusterPresetRow)[] = [
  'surge',
  'sway',
  'heave',
  'pitch',
  'yaw',
  'roll',
  'action1',
  'action2',
];

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

const IDENTIFIER_VALUES = ['0', '1', '2', '3', '4', '5', '6', '7'] as const;
const SPIN_DIRECTION_VALUES = ['1', '-1'] as const;

const identifierSchema = z.enum(IDENTIFIER_VALUES);
const spinDirectionSchema = z.enum(SPIN_DIRECTION_VALUES);

type IdentifierValue = z.infer<typeof identifierSchema>;
type SpinDirectionValue = z.infer<typeof spinDirectionSchema>;
type ThrusterIndex = (typeof THRUSTER_INDICES)[number];
type ThrusterTuple<T> = [T, T, T, T, T, T, T, T];

const mapThrusterTuple = <T,>(map: (index: ThrusterIndex) => T): ThrusterTuple<T> =>
  THRUSTER_INDICES.map((index) => map(index)) as ThrusterTuple<T>;

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

const toRow = (values: number[] | undefined, fallback: Row): Row =>
  mapThrusterTuple((index) => clampAllocationValue(values?.[index] ?? fallback[index]));

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

const toIdentifierValue = (value: number): IdentifierValue => {
  const clamped = Math.max(0, Math.min(7, Math.trunc(value)));
  const parsed = String(clamped);

  return isIdentifierValue(parsed) ? parsed : '0';
};

const toSpinDirectionValue = (value: number): SpinDirectionValue => (value === -1 ? '-1' : '1');

const identifierValueSet = new Set<string>(IDENTIFIER_VALUES);
const spinDirectionValueSet = new Set<string>(SPIN_DIRECTION_VALUES);

const isIdentifierValue = (value: string): value is IdentifierValue =>
  identifierValueSet.has(value);

const isSpinDirectionValue = (value: string): value is SpinDirectionValue =>
  spinDirectionValueSet.has(value);

type FormValues = z.infer<typeof formSchema>;

export const Calibration: Component = () => {
  const [testDisabled, setTestDisabled] = createSignal<boolean[]>(
    Array(PIN_NUMBERS.length).fill(false),
  );

  const defaultAllocationRows = transpose(rovConfigStore.thrusterAllocation);
  const [initialAllocation] = createSignal<number[][]>(
    defaultAllocationRows.map((row) => [...row]),
  );

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
        identifiers: mapThrusterTuple((index) =>
          parseIdentifier(
            value.thrusterPinSetup.identifiers[index],
            currentPinSetup.identifiers[index],
          ),
        ),
        spinDirections: mapThrusterTuple((index) =>
          parseSpinDirection(
            value.thrusterPinSetup.spinDirections[index],
            currentPinSetup.spinDirections[index],
          ),
        ),
      };

      const normalizedDisplayRows: ThrusterTuple<Row> = mapThrusterTuple((index) =>
        toRow(
          value.thrusterAllocation[index],
          toRow(defaultAllocationRows[index], currentAllocation[index]),
        ),
      );

      const allocationByThruster = transpose(normalizedDisplayRows);

      const thrusterAllocation: ThrusterAllocation = mapThrusterTuple((index) =>
        toRow(allocationByThruster[index], currentAllocation[index]),
      );

      return setRovConfig({
        thrusterPinSetup,
        thrusterAllocation,
      });
    },
  }));

  const applyPreset = (presetRows: ThrusterPresetRow): void => {
    PRESET_ROW_KEYS.forEach((key, rowIndex) => {
      const presetRow = presetRows[key];
      if (presetRow !== undefined) {
        presetRow.forEach((value, colIndex) => {
          form.setFieldValue(`thrusterAllocation[${rowIndex}][${colIndex}]`, value);
        });
      }
    });
  };

  const resetAllocation = (): void => {
    const initial = initialAllocation();
    initial.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        form.setFieldValue(`thrusterAllocation[${rowIndex}][${colIndex}]`, value);
      });
    });
  };

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
          <Portal>
            <SelectPositioner>
              <SelectContent>
                <SelectList>
                  <For each={identifierCollection.items}>
                    {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
                  </For>
                </SelectList>
              </SelectContent>
            </SelectPositioner>
          </Portal>
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
          <Portal>
            <SelectPositioner>
              <SelectContent>
                <SelectList>
                  <For each={spinDirectionCollection.items}>
                    {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
                  </For>
                </SelectList>
              </SelectContent>
            </SelectPositioner>
          </Portal>
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
      <form.Form class='mb-24'>
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
                  <Tooltip
                    positioning={{
                      placement: 'top',
                    }}
                  >
                    <TooltipTrigger>Pin</TooltipTrigger>
                    <Portal>
                      <TooltipPositioner>
                        <TooltipContent>
                          <TooltipArrow />
                          <p>
                            The general-purpose pin on the microcontroller that the thruster uses.
                          </p>
                        </TooltipContent>
                      </TooltipPositioner>
                    </Portal>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip
                    positioning={{
                      placement: 'top',
                    }}
                  >
                    <TooltipTrigger>Identifier</TooltipTrigger>
                    <Portal>
                      <TooltipPositioner>
                        <TooltipContent>
                          <TooltipArrow />
                          <p>Identifier used by thruster allocation for this physical thruster.</p>
                        </TooltipContent>
                      </TooltipPositioner>
                    </Portal>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip
                    positioning={{
                      placement: 'top',
                    }}
                  >
                    <TooltipTrigger>Spin Direction</TooltipTrigger>
                    <Portal>
                      <TooltipPositioner>
                        <TooltipContent>
                          <TooltipArrow />
                          <p>The default propeller direction for this thruster.</p>
                        </TooltipContent>
                      </TooltipPositioner>
                    </Portal>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip
                    positioning={{
                      placement: 'top',
                    }}
                  >
                    <TooltipTrigger>Test</TooltipTrigger>
                    <Portal>
                      <TooltipPositioner>
                        <TooltipContent>
                          <TooltipArrow />
                          <p>Run a short low-speed spin test on the selected pin.</p>
                        </TooltipContent>
                      </TooltipPositioner>
                    </Portal>
                  </Tooltip>
                </TableHead>
                <TableHead class='text-right'>
                  <Tooltip
                    positioning={{
                      placement: 'top',
                    }}
                  >
                    <TooltipTrigger>RPM</TooltipTrigger>
                    <Portal>
                      <TooltipPositioner>
                        <TooltipContent>
                          <TooltipArrow />
                          <p>Live revolutions per minute from telemetry.</p>
                        </TooltipContent>
                      </TooltipPositioner>
                    </Portal>
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
          <div class='flex items-center gap-2'>
            <Menu>
              <MenuTrigger
                asChild={(triggerProps) => (
                  <Button {...triggerProps()} variant='outline'>
                    Presets
                  </Button>
                )}
              />
              <Portal>
                <MenuPositioner>
                  <MenuContent>
                    <For each={THRUSTER_PRESETS}>
                      {(preset) => (
                        <MenuItem value={preset.name} onClick={() => applyPreset(preset.rows)}>
                          <div class='flex flex-col'>
                            <span>{preset.name}</span>
                            {preset.description && (
                              <span class='text-xs text-muted-foreground'>
                                {preset.description}
                              </span>
                            )}
                          </div>
                        </MenuItem>
                      )}
                    </For>
                  </MenuContent>
                </MenuPositioner>
              </Portal>
            </Menu>
            <Tooltip positioning={{ placement: 'top' }}>
              <TooltipTrigger
                asChild={(tooltipProps) => (
                  <Button
                    {...tooltipProps()}
                    variant='ghost'
                    size='icon'
                    aria-label='Reset allocation'
                    onClick={resetAllocation}
                  >
                    <RestartAltIcon class='size-4' />
                  </Button>
                )}
              />
              <Portal>
                <TooltipPositioner>
                  <TooltipContent>
                    Restore initial allocation
                    <TooltipArrow />
                  </TooltipContent>
                </TooltipPositioner>
              </Portal>
            </Tooltip>
          </div>
          <Table class='border'>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger>Identifier</TooltipTrigger>
                    <Portal>
                      <TooltipPositioner>
                        <TooltipContent>
                          <TooltipArrow />
                          <p>Identifier for each thruster, defined in thruster pin setup.</p>
                        </TooltipContent>
                      </TooltipPositioner>
                    </Portal>
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
                        <Portal>
                          <TooltipPositioner>
                            <TooltipContent>
                              <TooltipArrow />
                              <p>{ROW_LABEL_TOOLTIPS[rowIndex()]}</p>
                            </TooltipContent>
                          </TooltipPositioner>
                        </Portal>
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
        <form.AutoSubmit />
      </form.Form>
    </form.AppForm>
  );
};

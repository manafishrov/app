import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { FanIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { useAppForm } from '@/components/ui/Form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { toast } from '@/components/ui/Toaster';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

import { logError } from '@/lib/log';

import { type Row, rovConfigStore, setRovConfig } from '@/stores/rovConfig';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const THRUSTER_POLE_PAIRS = 6;

const formSchema = z
  .object({
    identifiers: z.tuple([
      z.number(),
      z.number(),
      z.number(),
      z.number(),
      z.number(),
      z.number(),
      z.number(),
      z.number(),
    ]),
    spinDirections: z.tuple([
      z.number(),
      z.number(),
      z.number(),
      z.number(),
      z.number(),
      z.number(),
      z.number(),
      z.number(),
    ]),
  })
  .refine(
    (data) => {
      const identifiers = data.identifiers.filter((id) => id !== 0);
      return new Set(identifiers).size === identifiers.length;
    },
    {
      message: 'Each thruster identifier must be unique when not set to None.',
      path: ['identifiers'],
    },
  );

function ThrusterPinSetupTableForm() {
  const thrusterPinSetup = useStore(
    rovConfigStore,
    (state) => state?.thrusterPinSetup,
  );
  const thrusterErpms = useStore(
    rovTelemetryStore,
    (state) => state?.thrusterErpms,
  );
  const pinNumbers = [6, 7, 8, 9, 18, 19, 20, 21];
  const identifierFieldNames = [
    'identifiers[0]',
    'identifiers[1]',
    'identifiers[2]',
    'identifiers[3]',
    'identifiers[4]',
    'identifiers[5]',
    'identifiers[6]',
    'identifiers[7]',
  ] as const;
  const spinDirectionFieldNames = [
    'spinDirections[0]',
    'spinDirections[1]',
    'spinDirections[2]',
    'spinDirections[3]',
    'spinDirections[4]',
    'spinDirections[5]',
    'spinDirections[6]',
    'spinDirections[7]',
  ] as const;
  const [testDisabled, setTestDisabled] = useState<boolean[]>(
    Array(pinNumbers.length).fill(false),
  );

  const form = useAppForm({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      identifiers: thrusterPinSetup?.identifiers ?? [0, 0, 0, 0, 0, 0, 0, 0],
      spinDirections: thrusterPinSetup?.spinDirections ?? [
        0, 0, 0, 0, 0, 0, 0, 0,
      ],
    },
    onSubmit: async ({ value }) => {
      await setRovConfig({
        thrusterPinSetup: value as { identifiers: Row; spinDirections: Row },
      });
      toast.success('Thruster pin setup saved');
    },
  });

  useEffect(() => {
    if (thrusterPinSetup) {
      form.reset({
        identifiers: thrusterPinSetup.identifiers,
        spinDirections: thrusterPinSetup.spinDirections,
      });
    }
  }, [thrusterPinSetup, form]);

  async function testThruster(identifier: number, index: number) {
    setTestDisabled((prev: boolean[]): boolean[] => {
      const updated: boolean[] = Array.isArray(prev) ? [...prev] : [];
      updated[index] = true;
      return updated;
    });
    try {
      await invoke('start_thruster_test', { payload: identifier });
    } catch (error) {
      logError('Failed to start thruster test:', error);
      toast.error('Failed to start thruster test');
    } finally {
      setTimeout(() => {
        setTestDisabled((prev: boolean[]): boolean[] => {
          const updated: boolean[] = Array.isArray(prev) ? [...prev] : [];
          updated[index] = false;
          return updated;
        });
      }, 2000);
    }
  }

  if (!thrusterPinSetup) return;

  return (
    <>
      <div>
        <h3 className='text-2xl font-semibold tracking-tight'>
          Thruster pin setup
        </h3>
        <p className='text-muted-foreground text-sm'>
          Use this table to configure each thruster connected to your ROV. For
          each pin, choose the identifier by observing which thruster spins when
          you test it and adjust the spin direction so that the thruster rotates
          forward according to your propeller type.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className='relative space-y-4'
      >
        <form.AppForm>
          <Table className='border'>
            <TableHeader>
              <TableRow>
                <TableHead className='text-center'>
                  <Tooltip>
                    <TooltipTrigger>Pin</TooltipTrigger>
                    <TooltipContent>
                      <p>
                        The general purpose pin on the Raspberry Pi Pico that
                        the thruster is connected to.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger>Identifier</TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Identifier to be used for the thruster in the thruster
                        allocation.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger>Spin Direction</TooltipTrigger>
                    <TooltipContent>
                      <p>
                        The default spin direction for the propeller on the
                        thruster.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger>Test</TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Spins the thruster slowly in the specified direction on
                        the specified pin.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger>RPM</TooltipTrigger>
                    <TooltipContent>
                      <p>The revolutions per minute of the thruster.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pinNumbers.map((pin, index) => (
                <TableRow key={pin}>
                  <TableCell className='text-center'>GP{pin}</TableCell>
                  <TableCell>
                    <form.AppField name={identifierFieldNames[index]!}>
                      {(field) => (
                        <field.SelectField
                          options={[
                            { value: '0', label: 'None' },
                            ...Array.from({ length: 8 }, (_, i) => ({
                              value: String(i + 1),
                              label: String(i + 1),
                            })),
                          ]}
                        />
                      )}
                    </form.AppField>
                  </TableCell>
                  <TableCell>
                    <form.AppField name={spinDirectionFieldNames[index]!}>
                      {(field) => (
                        <field.SelectField
                          options={[
                            { value: '0', label: 'None' },
                            { value: '1', label: 'Normal' },
                            { value: '-1', label: 'Reversed' },
                          ]}
                        />
                      )}
                    </form.AppField>
                  </TableCell>
                  <TableCell>
                    <Button
                      type='button'
                      variant='outline'
                      disabled={
                        (testDisabled[index] ?? false) ||
                        (thrusterErpms[index] ?? 0) !== 0 ||
                        form.getFieldValue(identifierFieldNames[index]!) === 0
                      }
                      onClick={async () => {
                        const identifier = form.getFieldValue(
                          identifierFieldNames[index]!,
                        );
                        if (identifier) {
                          await testThruster(identifier, index);
                        }
                      }}
                    >
                      Test
                    </Button>
                  </TableCell>
                  <TableCell className='flex items-center gap-2'>
                    <FanIcon
                      className={((thrusterErpms[index] ?? 0) > 0
                        ? 'animate-spin'
                        : ''
                      ).toString()}
                      style={{
                        animationDuration: `${
                          (thrusterErpms[index] ?? 0) > 0
                            ? 60_000 /
                              ((thrusterErpms[index] ?? 0) /
                                THRUSTER_POLE_PAIRS /
                                60)
                            : 0
                        }ms`,
                      }}
                    />
                    {Math.round((thrusterErpms[index] ?? 0) / 6)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <form.Subscribe
            selector={(state) => [state.errors]}
            children={([errors]) =>
              errors && errors.length > 0 ? (
                <div className='text-destructive text-sm font-medium'>
                  {errors
                    .map((e) =>
                      typeof e === 'string' ? e : e?.message || String(e),
                    )
                    .join(', ')}
                </div>
              ) : null
            }
          />
          <div className='flex items-center gap-4'>
            <form.SubmitButton className='w-44'>Save Changes</form.SubmitButton>
          </div>
        </form.AppForm>
      </form>
    </>
  );
}

export { ThrusterPinSetupTableForm };

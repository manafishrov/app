import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

import { ThrusterRpm } from '@/components/composites/ThrusterRpm';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
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

function ThrusterPinSetupTable() {
  const thrusterPinSetup = useStore(
    rovConfigStore,
    (state) => state?.thrusterPinSetup,
  );
  const thrusterRpms = useStore(
    rovTelemetryStore,
    (state) => state?.thrusterRpms,
  );
  const pinNumbers = [6, 7, 8, 9, 18, 19, 20, 21];
  const [testDisabled, setTestDisabled] = useState<boolean[]>(
    Array(pinNumbers.length).fill(false),
  );

  async function handleIdentifierChange(index: number, value: number) {
    if (!thrusterPinSetup) return;

    const newIdentifiers = [...thrusterPinSetup.identifiers];
    newIdentifiers[index] = value;
    const newThrusterPinSetup = {
      ...thrusterPinSetup,
      identifiers: newIdentifiers as Row,
    };
    await setRovConfig({ thrusterPinSetup: newThrusterPinSetup });
  }

  async function handleSpinDirectionChange(index: number, value: number) {
    if (!thrusterPinSetup) return;

    const newSpinDirections = [...thrusterPinSetup.spinDirections];
    newSpinDirections[index] = value;
    const newThrusterPinSetup = {
      ...thrusterPinSetup,
      spinDirections: newSpinDirections as Row,
    };
    await setRovConfig({ thrusterPinSetup: newThrusterPinSetup });
  }

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
          Thruster Pin Setup
        </h3>
        <p className='text-muted-foreground text-sm'>
          Use this table to configure each thruster connected to your ROV. For
          each pin, choose the identifier by observing which thruster spins when
          you test it and adjust the spin direction so that the thruster rotates
          forward according to your propeller type.
        </p>
      </div>
      <div className='relative space-y-4'>
        <Table className='border'>
          <TableHeader>
            <TableRow>
              <TableHead className='text-center'>
                <Tooltip>
                  <TooltipTrigger>Pin</TooltipTrigger>
                  <TooltipContent>
                    <p>
                      The general purpose pin on the microcontroller that the
                      thruster is connected to.
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
                  <Select
                    value={String(thrusterPinSetup.identifiers[index])}
                    onValueChange={(value) =>
                      void handleIdentifierChange(index, Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 8 }, (_, i) => ({
                        value: String(i),
                        label: String(i + 1),
                      })).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={String(thrusterPinSetup.spinDirections[index])}
                    onValueChange={(value) =>
                      void handleSpinDirectionChange(index, Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='1'>Normal</SelectItem>
                      <SelectItem value='-1'>Reversed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={
                      (testDisabled[index] ?? false) ||
                      (thrusterRpms[index] ?? 0) !== 0
                    }
                    onClick={async () => {
                      if (
                        thrusterPinSetup?.identifiers[index] !== undefined &&
                        thrusterPinSetup?.identifiers[index] !== null
                      ) {
                        await testThruster(
                          thrusterPinSetup.identifiers[index],
                          index,
                        );
                      }
                    }}
                  >
                    Test
                  </Button>
                </TableCell>
                <TableCell className='flex items-center gap-2'>
                  <ThrusterRpm rpm={thrusterRpms[index] ?? 0} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export { ThrusterPinSetupTable };

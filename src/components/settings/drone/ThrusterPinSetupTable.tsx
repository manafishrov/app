import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { FanIcon } from 'lucide-react';
import { useState } from 'react';

import { IdentifierSelect } from '@/components/settings/drone/IdentifierSelect';
import { SpinDirectionSelect } from '@/components/settings/drone/SpinDirectionSelect';
import { Button } from '@/components/ui/Button';
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

import { type Row, droneConfigStore } from '@/stores/droneConfigStore';
import { statusStore } from '@/stores/statusStore';

const THRUSTER_POLE_PAIRS = 6;

function ThrusterPinSetupTable() {
  const { thrusterPinSetup } = useStore(droneConfigStore);
  const { thrusterErpms } = useStore(statusStore);
  const pinNumbers = [6, 7, 8, 9, 18, 19, 20, 21];
  const [testDisabled, setTestDisabled] = useState<boolean[]>(
    Array(pinNumbers.length).fill(false),
  );

  async function handleIdentifierChange(index: number, value: number) {
    if (!thrusterPinSetup) {
      return;
    }
    const newIdentifiers = [...thrusterPinSetup.identifiers];
    newIdentifiers[index] = value;
    const newThrusterPinSetup = {
      ...thrusterPinSetup,
      identifiers: newIdentifiers as Row,
    };
    droneConfigStore.setState((config) => ({
      ...config,
      thrusterPinSetup: newThrusterPinSetup,
    }));
    try {
      await invoke('thruster_pin_setup', { payload: newThrusterPinSetup });
    } catch (error) {
      logError('Failed to set thruster pin setup:', error);
      toast.error('Failed to set thruster pin setup');
    }
  }

  async function handleSpinDirectionChange(index: number, value: number) {
    if (!thrusterPinSetup) {
      return;
    }
    const newSpinDirections = [...thrusterPinSetup.spinDirections];
    newSpinDirections[index] = value;
    const newThrusterPinSetup = {
      ...thrusterPinSetup,
      spinDirections: newSpinDirections as Row,
    };
    droneConfigStore.setState((config) => ({
      ...config,
      thrusterPinSetup: newThrusterPinSetup,
    }));
    try {
      await invoke('thruster_pin_setup', { payload: newThrusterPinSetup });
    } catch (error) {
      logError('Failed to set thruster pin setup', error);
      toast.error('Failed to set thruster pin setup');
    }
  }

  async function testThruster(identifier: number, index: number) {
    setTestDisabled((prev: boolean[]): boolean[] => {
      const updated: boolean[] = Array.isArray(prev) ? [...prev] : [];
      updated[index] = true;
      return updated;
    });
    try {
      await invoke('test_thruster', { payload: identifier });
    } catch (error) {
      logError('Failed to test thruster:', error);
      toast.error('Failed to test thruster');
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

  return (
    <>
      <div>
        <h3 className='text-2xl font-semibold tracking-tight'>
          Thruster pin setup
        </h3>
        <p className='text-muted-foreground text-sm'>
          Use this table to configure each thruster connected to your drone. For
          each pin, choose the identifier by observing which thruster spins when
          you test it and adjust the spin direction so that the thruster rotates
          forward according to your propeller type.
        </p>
      </div>
      <Table className='border'>
        <TableHeader>
          <TableRow>
            <TableHead className='text-center'>
              <Tooltip>
                <TooltipTrigger>Pin</TooltipTrigger>
                <TooltipContent>
                  <p>
                    The general purpose pin on the Raspberry Pi Pico that the
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
                    Spins the thruster slowly in the specified direction on the
                    specified pin.
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
                <IdentifierSelect
                  value={thrusterPinSetup?.identifiers[index] ?? 0}
                  onValueChange={(value) =>
                    handleIdentifierChange(index, value)
                  }
                />
              </TableCell>
              <TableCell>
                <SpinDirectionSelect
                  value={thrusterPinSetup?.spinDirections[index] ?? 0}
                  onValueChange={(value) =>
                    handleSpinDirectionChange(index, value)
                  }
                />
              </TableCell>
              <TableCell>
                <Button
                  variant='outline'
                  disabled={
                    (testDisabled[index] ?? false) ||
                    (thrusterErpms[index] ?? 0) !== 0
                  }
                  onClick={async () => {
                    if (thrusterPinSetup?.identifiers[index]) {
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
    </>
  );
}

export { ThrusterPinSetupTable };

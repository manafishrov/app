import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { FanIcon } from 'lucide-react';
import { useState } from 'react';

import { IdentifierSelect } from '@/components/calibration/IdentifierSelect';
import { SpinDirectionSelect } from '@/components/calibration/SpinDirectionSelect';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
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
  const [loadingStates, setLoadingStates] = useState<boolean[]>(
    Array(pinNumbers.length).fill(false),
  );

  if (!thrusterPinSetup) {
    return;
  }

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
    }
  }

  async function handleTestThruster(identifier: number) {
    try {
      await invoke('test_thruster', { payload: identifier });
    } catch (error) {
      logError('Failed to test thruster:', error);
    }
  }

  return (
    <>
      <h3 className='text-2xl font-semibold tracking-tight'>
        Thruster pin setup
      </h3>
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
                  disabled={loadingStates[index]}
                  onClick={async () => {
                    const identifier = thrusterPinSetup.identifiers[index];
                    if (identifier !== undefined) {
                      const newLoadingStates = [...loadingStates];
                      newLoadingStates[index] = true;
                      setLoadingStates(newLoadingStates);
                      await handleTestThruster(identifier);
                      setTimeout(() => {
                        setLoadingStates((prevLoadingStates) => {
                          const newLoadingStates = [...prevLoadingStates];
                          newLoadingStates[index] = false;
                          return newLoadingStates;
                        });
                      }, 2000);
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

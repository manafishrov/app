import { invoke } from '@tauri-apps/api/core';
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

import type { Row, ThrusterPinSetup } from '@/routes/settings/calibration';

function ThrusterPinSetupTable({
  thrusterPinSetup: initialThrusterPinSetup,
}: {
  thrusterPinSetup: ThrusterPinSetup;
}) {
  const [thrusterPinSetup, setThrusterPinSetup] = useState(
    initialThrusterPinSetup,
  );
  const pinNumbers = [6, 7, 8, 9, 18, 19, 20, 21];

  async function handleIdentifierChange(index: number, value: number) {
    const newIdentifiers = [...thrusterPinSetup.identifiers];
    newIdentifiers[index] = value;
    const newThrusterPinSetup = {
      ...thrusterPinSetup,
      identifiers: newIdentifiers as Row,
    };
    setThrusterPinSetup(newThrusterPinSetup);
    try {
      await invoke('thruster_pin_setup', { payload: newThrusterPinSetup });
    } catch (error) {
      logError('Failed to set thruster pin setup:', error);
    }
  }

  async function handleSpinDirectionChange(index: number, value: number) {
    const newSpinDirections = [...thrusterPinSetup.spinDirections];
    newSpinDirections[index] = value;
    const newThrusterPinSetup = {
      ...thrusterPinSetup,
      spinDirections: newSpinDirections as Row,
    };
    setThrusterPinSetup(newThrusterPinSetup);
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {pinNumbers.map((pin, index) => (
            <TableRow key={pin}>
              <TableCell className='text-center'>GP{pin}</TableCell>
              <TableCell>
                <IdentifierSelect
                  value={thrusterPinSetup.identifiers[index]!}
                  onValueChange={(value) =>
                    handleIdentifierChange(index, value)
                  }
                />
              </TableCell>
              <TableCell>
                <SpinDirectionSelect
                  value={thrusterPinSetup.spinDirections[index]!}
                  onValueChange={(value) =>
                    handleSpinDirectionChange(index, value)
                  }
                />
              </TableCell>
              <TableCell>
                <Button
                  variant='outline'
                  onClick={() =>
                    handleTestThruster(thrusterPinSetup.identifiers[index])
                  }
                >
                  Test
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

export { ThrusterPinSetupTable };

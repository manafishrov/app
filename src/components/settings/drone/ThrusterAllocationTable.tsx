import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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

import {
  type ThrusterAllocation,
  droneConfigStore,
} from '@/stores/droneConfigStore';

function ThrusterAllocationTable() {
  const { thrusterAllocation } = useStore(droneConfigStore);
  const [displayAllocation, setDisplayAllocation] = useState<string[][] | null>(
    null,
  );

  if (thrusterAllocation && displayAllocation === null) {
    const initialDisplay = thrusterAllocation.map((row) =>
      row.map((cell) => String(cell)),
    );
    setDisplayAllocation(initialDisplay);
  }

  if (!thrusterAllocation || !displayAllocation) {
    return null;
  }

  const rowLabels = [
    'Horizontal',
    'Strafe',
    'Vertical',
    'Pitch',
    'Yaw',
    'Roll',
    'Action 1',
    'Action 2',
  ];

  const rowLabelTooltips = [
    'Contribution of each thruster to horizontal (forward/backward) movement.',
    'Contribution of each thruster to strafing (sideways) movement.',
    'Contribution of each thruster to vertical (ascent/descent) movement.',
    'Contribution of each thruster to pitching (tilting forward/backward) movement.',
    'Contribution of each thruster to yawing (turning left/right) movement.',
    'Contribution of each thruster to rolling (tilting side to side) movement.',
    'Contribution of each thruster to the first custom action.',
    'Contribution of each thruster to the second custom action.',
  ];

  function handleAllocationChange(
    rowIndex: number,
    colIndex: number,
    value: string,
  ) {
    if (!displayAllocation || !thrusterAllocation) {
      return;
    }

    let displayValue = value;
    let numericValue: number;

    if (value === '' || value === '-') {
      numericValue = 0;
    } else {
      const hasMultipleDots = (value.match(/\./g) ?? []).length > 1;
      const hasMisplacedMinus = value.lastIndexOf('-') > 0;

      if (hasMultipleDots || hasMisplacedMinus) {
        numericValue = 0;
        displayValue = '0';
      } else {
        const parts = value.split('.');
        if (parts[1] && parts[1].length > 2) {
          displayValue = `${parts[0]}.${parts[1].substring(0, 2)}`;
        }

        numericValue = Number.parseFloat(displayValue);

        if (numericValue > 1) {
          numericValue = 1;
          displayValue = '1';
        } else if (numericValue < -1) {
          numericValue = -1;
          displayValue = '-1';
        }
      }
    }

    const newDisplayAllocation = displayAllocation.map((row, rIndex) =>
      rIndex === rowIndex
        ? row.map((cell, cIndex) => (cIndex === colIndex ? displayValue : cell))
        : row,
    );
    setDisplayAllocation(newDisplayAllocation);

    const newAllocation = thrusterAllocation.map((row, rIndex) => {
      if (rIndex === rowIndex) {
        return row.map((cell, cIndex) => {
          if (cIndex === colIndex) {
            return numericValue;
          }
          return cell;
        });
      }
      return row;
    }) as ThrusterAllocation;

    droneConfigStore.setState((config) => ({
      ...config,
      thrusterAllocation: newAllocation,
    }));
  }

  async function handleUpdate() {
    try {
      await invoke('thruster_allocation', { payload: thrusterAllocation });
    } catch (error) {
      logError('Failed to set thruster allocation:', error);
    }
  }

  return (
    <>
      <h3 className='text-2xl font-semibold tracking-tight'>
        Thruster allocation
      </h3>
      <Table className='border'>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Tooltip>
                <TooltipTrigger>Identifier</TooltipTrigger>
                <TooltipContent>
                  <p>
                    Identifier to be used for the thruster given in the pin
                    setup. allocation.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TableHead>
            {Array.from({ length: 8 }, (_, index) => (
              <TableHead key={index} className='text-center'>
                {index + 1}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rowLabels.map((rowLabel, rowIndex) => (
            <TableRow key={rowLabel}>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger>{rowLabel}</TooltipTrigger>
                  <TooltipContent>
                    <p>{rowLabelTooltips[rowIndex]}</p>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              {Array.from({ length: 8 }, (_, colIndex) => (
                <TableCell key={`${rowLabel}-${colIndex}`}>
                  <Input
                    className='w-14 text-center'
                    inputMode='numeric'
                    value={displayAllocation[rowIndex]?.[colIndex] ?? ''}
                    onChange={(event) =>
                      handleAllocationChange(
                        rowIndex,
                        colIndex,
                        event.target.value
                          .replace(',', '.')
                          .replace(/[^\d.-]/g, ''),
                      )
                    }
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button onClick={handleUpdate}>Update thrusters</Button>
    </>
  );
}

export { ThrusterAllocationTable };

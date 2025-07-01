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

import { logError } from '@/lib/log';

import type { ThrusterAllocation } from '@/routes/settings/calibration';

function ThrusterAllocationTable({
  thrusterAllocation: initialThrusterAllocation,
}: {
  thrusterAllocation: ThrusterAllocation;
}) {
  const [thrusterAllocation, setThrusterAllocation] = useState(
    initialThrusterAllocation,
  );
  const rowLabels = [
    'Forward',
    'Side',
    'Up/Down',
    'Pitch',
    'Yaw',
    'Roll',
    'Action 1',
    'Action 2',
  ];

  function handleAllocationChange(
    rowIndex: number,
    colIndex: number,
    value: string,
  ) {
    const newAllocation = thrusterAllocation.map((row, rIndex) => {
      if (rIndex === rowIndex) {
        return row.map((cell, cIndex) => {
          if (cIndex === colIndex) {
            return Number.parseFloat(value) || 0;
          }
          return cell;
        });
      }
      return row;
    }) as ThrusterAllocation;
    setThrusterAllocation(newAllocation);
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
            <TableHead />
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
              <TableCell>{rowLabel}</TableCell>
              {Array.from({ length: 8 }, (_, colIndex) => (
                <TableCell key={`${rowLabel}-${colIndex}`}>
                  <Input
                    className='w-14 text-center'
                    value={thrusterAllocation[rowIndex]?.[colIndex] ?? ''}
                    onChange={(event) =>
                      handleAllocationChange(
                        rowIndex,
                        colIndex,
                        event.target.value,
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

import { useStore } from '@tanstack/react-store';
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

import {
  type Row,
  type ThrusterAllocation,
  rovConfigStore,
  setRovConfig,
} from '@/stores/rovConfig';

function ThrusterAllocationTable() {
  const thrusterAllocation = useStore(
    rovConfigStore,
    (state) => state?.thrusterAllocation,
  );
  const [displayAllocation, setDisplayAllocation] = useState<string[][] | null>(
    null,
  );

  if (thrusterAllocation && !displayAllocation) {
    const initialDisplay = thrusterAllocation.map((row) =>
      row.map((cell) => String(cell)),
    );
    setDisplayAllocation(initialDisplay);
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
    'Contribution of each thruster to for action 1.',
    'Contribution of each thruster to for action 2.',
  ];

  function handleAllocationChange(
    rowIndex: number,
    colIndex: number,
    value: string,
  ) {
    if (!displayAllocation || !thrusterAllocation) return;

    let displayValue = value;

    if (value !== '' && value !== '-') {
      const hasMultipleDots = (value.match(/\./g) ?? []).length > 1;
      const hasMisplacedMinus = value.lastIndexOf('-') > 0;

      if (hasMultipleDots || hasMisplacedMinus) {
        displayValue = '0';
      } else {
        const parts = value.split('.');
        if (parts[1] && parts[1].length > 2) {
          displayValue = `${parts[0]}.${parts[1].substring(0, 2)}`;
        }

        const parsedValue = Number.parseFloat(displayValue);

        if (parsedValue > 1) {
          displayValue = '1';
        } else if (parsedValue < -1) {
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
  }

  return (
    <>
      <div>
        <h3 className='text-2xl font-semibold tracking-tight'>
          Thruster Allocation
        </h3>
        <p className='text-muted-foreground text-sm'>
          Use this matrix to control how each thruster responds to different
          movement commands. For each action, assign a value between -1 and 1 to
          specify the amount of thrust each thruster should provide: positive
          values produce forward thrust, negative values produce reverse thrust,
          and 0 disables the thruster for that action.
        </p>
      </div>
      <Table className='border'>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Tooltip>
                <TooltipTrigger>Identifier</TooltipTrigger>
                <TooltipContent>
                  <p>
                    Identifier for the given thruster, defined in the pin setup.
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
                    value={displayAllocation?.[rowIndex]?.[colIndex] ?? ''}
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
      <Button
        className='w-40'
        onClick={async () => {
          if (!displayAllocation) return;

          const newThrusterAllocation = displayAllocation.map(
            (row: string[]) =>
              row.map((cell) => {
                const parsedValue = Number.parseFloat(cell);
                return Number.isNaN(parsedValue) ? 0 : parsedValue;
              }) as Row,
          ) as ThrusterAllocation;

          await setRovConfig({ thrusterAllocation: newThrusterAllocation });
          setDisplayAllocation(
            newThrusterAllocation.map((row) => row.map(String)),
          );
        }}
      >
        Update Thrusters
      </Button>
    </>
  );
}

export { ThrusterAllocationTable };

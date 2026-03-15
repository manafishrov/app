import type { Component, ComponentProps } from 'solid-js';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@manafishrov/ui/table';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import { Portal } from 'solid-js/web';

import * as m from '@/paraglide/messages';

import { ALLOCATION_FIELD_STEP, NEGATIVE_ONE, ONE } from './constants';
import { AllocationField } from './FieldRenderers';

type AllocationTableProps = {
  form: ComponentProps<typeof AllocationField>['form'];
  thrusterColumns: number[];
  rowLabels: readonly string[];
  rowLabelTooltips: readonly string[];
};

const AllocationLabelCell: Component<{ label: string; tooltip: string }> = (props) => (
  <TableCell>
    <Tooltip>
      <TooltipTrigger>{props.label}</TooltipTrigger>
      <Portal>
        <TooltipPositioner>
          <TooltipContent>
            <TooltipArrow />
            <p>{props.tooltip}</p>
          </TooltipContent>
        </TooltipPositioner>
      </Portal>
    </Tooltip>
  </TableCell>
);

const AllocationRows: Component<AllocationTableProps> = (props) => (
  <TableBody>
    <For each={props.rowLabels}>
      {(rowLabel, rowIndex) => (
        <TableRow>
          <AllocationLabelCell
            label={rowLabel}
            tooltip={props.rowLabelTooltips[rowIndex()] ?? ''}
          />
          <For each={props.thrusterColumns}>
            {(_, columnIndex) => (
              <TableCell class='w-20'>
                <AllocationField
                  form={props.form}
                  rowIndex={rowIndex()}
                  columnIndex={columnIndex()}
                  minimumValue={NEGATIVE_ONE}
                  maximumValue={ONE}
                  stepValue={ALLOCATION_FIELD_STEP}
                />
              </TableCell>
            )}
          </For>
        </TableRow>
      )}
    </For>
  </TableBody>
);

export const AllocationTable: Component<AllocationTableProps> = (props) => (
  <Table class='border'>
    <TableHeader>
      <TableRow>
        <TableHead>
          <Tooltip positioning={{ placement: 'top' }}>
            <TooltipTrigger>{m.calibration_thruster_allocation_identifier()}</TooltipTrigger>
            <Portal>
              <TooltipPositioner>
                <TooltipContent>
                  <TooltipArrow />
                  <p>{m.calibration_thruster_allocation_identifier_tooltip()}</p>
                </TooltipContent>
              </TooltipPositioner>
            </Portal>
          </Tooltip>
        </TableHead>
        <For each={props.thrusterColumns}>
          {(identifier) => (
            <TableHead
              class='text-center'
              aria-label={m.calibration_allocation_thruster_aria({ identifier })}
            >
              {identifier}
            </TableHead>
          )}
        </For>
      </TableRow>
    </TableHeader>
    <AllocationRows {...props} />
  </Table>
);

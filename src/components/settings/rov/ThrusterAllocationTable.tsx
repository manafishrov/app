import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@manafishrov/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@manafishrov/ui/tooltip';
import { type Component, type JSX, For } from 'solid-js';

const THRUSTER_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

type ThrusterAllocationTableProps = {
  rowLabels: readonly string[];
  rowLabelTooltips: readonly string[];
  renderAllocationField: (rowIndex: number, columnIndex: number) => JSX.Element;
};

const ThrusterAllocationHeader: Component = () => (
  <TableHeader>
    <TableRow>
      <TableHead>
        <Tooltip>
          <TooltipTrigger>Identifier</TooltipTrigger>
          <TooltipContent>
            <p>Identifier for each thruster, defined in thruster pin setup.</p>
          </TooltipContent>
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
);

const ThrusterAllocationBody: Component<ThrusterAllocationTableProps> = (props) => (
  <TableBody>
    <For each={props.rowLabels}>
      {(rowLabel, rowIndex) => (
        <TableRow>
          <TableCell>
            <Tooltip>
              <TooltipTrigger>{rowLabel}</TooltipTrigger>
              <TooltipContent>
                <p>{props.rowLabelTooltips[rowIndex()]}</p>
              </TooltipContent>
            </Tooltip>
          </TableCell>
          <For each={THRUSTER_COLUMNS}>
            {(_, columnIndex) => (
              <TableCell class='w-20'>
                {props.renderAllocationField(rowIndex(), columnIndex())}
              </TableCell>
            )}
          </For>
        </TableRow>
      )}
    </For>
  </TableBody>
);

export const ThrusterAllocationTable: Component<ThrusterAllocationTableProps> = (props) => (
  <div class='space-y-4'>
    <div>
      <h3 class='text-2xl font-semibold tracking-tight'>Thruster allocation</h3>
      <p class='text-muted-foreground text-sm'>
        Tune how each thruster contributes to each movement axis. Use values between -1 and 1, where
        positive is forward thrust, negative is reverse thrust, and 0 disables thrust.
      </p>
    </div>
    <Table class='border'>
      <ThrusterAllocationHeader />
      <ThrusterAllocationBody {...props} />
    </Table>
  </div>
);

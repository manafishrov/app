import { Button } from '@manafishrov/ui/button';
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

import { ThrusterRpm } from '@/components/controls/ThrusterRpm';

type ThrusterPinSetupTableProps = {
  pinNumbers: readonly number[];
  thrusterRpms: readonly number[];
  testDisabled: readonly boolean[];
  onTestThruster: (index: number) => Promise<void>;
  renderIdentifierField: (index: number) => JSX.Element;
  renderSpinDirectionField: (index: number) => JSX.Element;
};

const ThrusterPinSetupHeader: Component = () => (
  <TableHeader>
    <TableRow>
      <TableHead class='text-center'>
        <Tooltip>
          <TooltipTrigger>Pin</TooltipTrigger>
          <TooltipContent>
            <p>The general-purpose pin on the microcontroller that the thruster uses.</p>
          </TooltipContent>
        </Tooltip>
      </TableHead>
      <TableHead>
        <Tooltip>
          <TooltipTrigger>Identifier</TooltipTrigger>
          <TooltipContent>
            <p>Identifier used by thruster allocation for this physical thruster.</p>
          </TooltipContent>
        </Tooltip>
      </TableHead>
      <TableHead>
        <Tooltip>
          <TooltipTrigger>Spin Direction</TooltipTrigger>
          <TooltipContent>
            <p>The default propeller direction for this thruster.</p>
          </TooltipContent>
        </Tooltip>
      </TableHead>
      <TableHead>
        <Tooltip>
          <TooltipTrigger>Test</TooltipTrigger>
          <TooltipContent>
            <p>Run a short low-speed spin test on the selected pin.</p>
          </TooltipContent>
        </Tooltip>
      </TableHead>
      <TableHead class='text-right'>
        <Tooltip>
          <TooltipTrigger>RPM</TooltipTrigger>
          <TooltipContent>
            <p>Live revolutions per minute from telemetry.</p>
          </TooltipContent>
        </Tooltip>
      </TableHead>
    </TableRow>
  </TableHeader>
);

const ThrusterPinSetupBody: Component<ThrusterPinSetupTableProps> = (props) => (
  <TableBody>
    <For each={props.pinNumbers}>
      {(pin, index) => (
        <TableRow>
          <TableCell class='text-center'>GP{pin}</TableCell>
          <TableCell>{props.renderIdentifierField(index())}</TableCell>
          <TableCell>{props.renderSpinDirectionField(index())}</TableCell>
          <TableCell>
            <Button
              type='button'
              variant='outline'
              disabled={props.testDisabled[index()] ?? false}
              onClick={() => {
                props.onTestThruster(index());
              }}
            >
              Test
            </Button>
          </TableCell>
          <TableCell class='w-24'>
            <div class='flex items-center justify-end gap-2'>
              <ThrusterRpm rpm={props.thrusterRpms[index()] ?? 0} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </For>
  </TableBody>
);

export const ThrusterPinSetupTable: Component<ThrusterPinSetupTableProps> = (props) => (
  <div class='space-y-4'>
    <div>
      <h3 class='text-2xl font-semibold tracking-tight'>Thruster pin setup</h3>
      <p class='text-muted-foreground text-sm'>
        Configure each microcontroller pin and test it to identify the matching thruster. Set spin
        direction so each thruster rotates forward for your propeller type.
      </p>
    </div>
    <Table class='border'>
      <ThrusterPinSetupHeader />
      <ThrusterPinSetupBody {...props} />
    </Table>
  </div>
);

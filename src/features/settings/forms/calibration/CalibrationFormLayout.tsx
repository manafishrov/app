import type { Accessor, Component, JSXElement } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { FieldLegend, Fieldset } from '@manafishrov/ui/field';
import { Menu, MenuContent, MenuItem, MenuPositioner, MenuTrigger } from '@manafishrov/ui/menu';
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
import RestartAltIcon from '~icons/material-symbols/restart-alt';

import { ThrusterRpm } from '@/components/ThrusterRpm';
import * as m from '@/paraglide/messages';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

import { THRUSTER_PRESETS, type ThrusterPresetRow } from './thrusterPresets';

type SharedProps = {
  thrusterColumns: number[];
  rowLabels: readonly string[];
  rowLabelTooltips: readonly string[];
};
type PinSetupProps = {
  pinNumbers: readonly number[];
  testDisabled: Accessor<boolean[]>;
  onTestThruster: (index: number) => void;
  renderIdentifierField: (index: number) => JSXElement;
  renderSpinDirectionField: (index: number) => JSXElement;
  zeroValue: number;
};
type AllocationProps = {
  onApplyPreset: (presetRows: ThrusterPresetRow) => void;
  onResetAllocation: () => void;
  renderAllocationField: (rowIndex: number, columnIndex: number) => JSXElement;
};
type LayoutProps = SharedProps &
  PinSetupProps &
  AllocationProps & {
    AppForm: Component<{ children: JSXElement }>;
    Form: Component<{ class?: string; children: JSXElement }>;
    AutoSubmit: Component;
  };

const TooltipHead: Component<{ label: string; tooltip: string; class?: string }> = (props) => (
  <TableHead class={props.class}>
    <Tooltip positioning={{ placement: 'top' }}>
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
  </TableHead>
);

const AllocationPresetMenu: Component<{
  onApplyPreset: (presetRows: ThrusterPresetRow) => void;
}> = (props) => (
  <Menu>
    <MenuTrigger
      asChild={(triggerProps) => (
        <Button {...triggerProps()} variant='outline'>
          {m.calibration_allocation_presets()}
        </Button>
      )}
    />
    <Portal>
      <MenuPositioner>
        <MenuContent>
          <For each={THRUSTER_PRESETS}>
            {(preset) => (
              <MenuItem
                value={preset.name}
                onClick={() => {
                  props.onApplyPreset(preset.rows);
                }}
              >
                <div class='flex flex-col'>
                  <span>{preset.name}</span>
                  {typeof preset.description === 'string' && preset.description.length > 0 ? (
                    <span class='text-xs text-muted-foreground'>{preset.description}</span>
                  ) : (
                    false
                  )}
                </div>
              </MenuItem>
            )}
          </For>
        </MenuContent>
      </MenuPositioner>
    </Portal>
  </Menu>
);

const AllocationResetButton: Component<{ onResetAllocation: () => void }> = (props) => (
  <Tooltip positioning={{ placement: 'top' }}>
    <TooltipTrigger
      asChild={(tooltipProps) => (
        <Button
          {...tooltipProps()}
          variant='ghost'
          size='icon'
          aria-label={m.calibration_allocation_reset()}
          onClick={props.onResetAllocation}
        >
          <RestartAltIcon class='size-4' />
        </Button>
      )}
    />
    <Portal>
      <TooltipPositioner>
        <TooltipContent>
          {m.calibration_allocation_restore_initial()}
          <TooltipArrow />
        </TooltipContent>
      </TooltipPositioner>
    </Portal>
  </Tooltip>
);

const PinSetupHeader: Component = () => (
  <TableHeader>
    <TableRow>
      <TooltipHead
        class='text-center'
        label={m.calibration_thruster_pin_setup_pin_label()}
        tooltip={m.calibration_thruster_pin_setup_pin_tooltip()}
      />
      <TooltipHead
        label={m.calibration_thruster_pin_setup_identifier_label()}
        tooltip={m.calibration_thruster_pin_setup_identifier_tooltip()}
      />
      <TooltipHead
        label={m.calibration_thruster_pin_setup_spin_direction_label()}
        tooltip={m.calibration_thruster_pin_setup_spin_direction_tooltip()}
      />
      <TooltipHead
        label={m.calibration_thruster_pin_setup_test_label()}
        tooltip={m.calibration_thruster_pin_setup_test_tooltip()}
      />
      <TooltipHead
        class='text-right'
        label={m.calibration_thruster_pin_setup_rpm_label()}
        tooltip={m.calibration_thruster_pin_setup_rpm_tooltip()}
      />
    </TableRow>
  </TableHeader>
);

const PinSetupRows: Component<PinSetupProps> = (props) => (
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
              disabled={props.testDisabled()[index()] ?? false}
              onClick={() => {
                props.onTestThruster(index());
              }}
            >
              {m.common_test()}
            </Button>
          </TableCell>
          <TableCell class='w-24'>
            <div class='flex items-center justify-end gap-2'>
              <ThrusterRpm rpm={rovTelemetryStore.thrusterRpms[index()] ?? props.zeroValue} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </For>
  </TableBody>
);

const PinSetupTable: Component<PinSetupProps> = (props) => (
  <Table class='border'>
    <PinSetupHeader />
    <PinSetupRows
      pinNumbers={props.pinNumbers}
      testDisabled={props.testDisabled}
      onTestThruster={props.onTestThruster}
      renderIdentifierField={props.renderIdentifierField}
      renderSpinDirectionField={props.renderSpinDirectionField}
      zeroValue={props.zeroValue}
    />
  </Table>
);

const AllocationTable: Component<SharedProps & AllocationProps> = (props) => (
  <Table class='border'>
    <TableHeader>
      <TableRow>
        <TooltipHead
          label={m.calibration_thruster_allocation_identifier()}
          tooltip={m.calibration_thruster_allocation_identifier_tooltip()}
        />
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
    <TableBody>
      <For each={props.rowLabels}>
        {(rowLabel, rowIndex) => (
          <TableRow>
            <TableCell>
              <Tooltip>
                <TooltipTrigger>{rowLabel}</TooltipTrigger>
                <Portal>
                  <TooltipPositioner>
                    <TooltipContent>
                      <TooltipArrow />
                      <p>{props.rowLabelTooltips[rowIndex()]}</p>
                    </TooltipContent>
                  </TooltipPositioner>
                </Portal>
              </Tooltip>
            </TableCell>
            <For each={props.thrusterColumns}>
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
  </Table>
);

export const CalibrationFormLayout: Component<LayoutProps> = (props) => (
  <props.AppForm>
    <props.Form class='mb-24'>
      <Fieldset>
        <FieldLegend>{m.calibration_thruster_pin_setup_title()}</FieldLegend>
        <p class='text-muted-foreground mb-4 text-sm'>
          {m.calibration_thruster_pin_setup_description()}
        </p>
        <PinSetupTable
          pinNumbers={props.pinNumbers}
          testDisabled={props.testDisabled}
          onTestThruster={props.onTestThruster}
          renderIdentifierField={props.renderIdentifierField}
          renderSpinDirectionField={props.renderSpinDirectionField}
          zeroValue={props.zeroValue}
        />
      </Fieldset>
      <Fieldset>
        <FieldLegend>{m.calibration_thruster_allocation_title()}</FieldLegend>
        <p class='text-muted-foreground mb-4 text-sm'>
          {m.calibration_thruster_allocation_description()}
        </p>
        <div class='flex items-center gap-2'>
          <AllocationPresetMenu onApplyPreset={props.onApplyPreset} />
          <AllocationResetButton onResetAllocation={props.onResetAllocation} />
        </div>
        <AllocationTable
          thrusterColumns={props.thrusterColumns}
          rowLabels={props.rowLabels}
          rowLabelTooltips={props.rowLabelTooltips}
          onApplyPreset={props.onApplyPreset}
          onResetAllocation={props.onResetAllocation}
          renderAllocationField={props.renderAllocationField}
        />
      </Fieldset>
      <props.AutoSubmit />
    </props.Form>
  </props.AppForm>
);

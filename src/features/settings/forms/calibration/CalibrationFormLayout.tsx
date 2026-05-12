import type { Accessor, Component, ComponentProps } from 'solid-js';

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

import { AllocationTable } from './AllocationTable';
import { IdentifierSelect, SpinDirectionSelect } from './FieldRenderers';
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
  form: ComponentProps<typeof IdentifierSelect>['form'];
  identifierCollection: ComponentProps<typeof IdentifierSelect>['identifierCollection'];
  zeroValue: number;
};
type AllocationProps = {
  onApplyPreset: (presetRows: ThrusterPresetRow) => void;
  onResetAllocation: () => void;
  form: ComponentProps<typeof IdentifierSelect>['form'];
};
type LayoutProps = SharedProps & PinSetupProps & AllocationProps;

const TooltipTableHead: Component<{ label: string; tooltip: string; class?: string }> = (props) => (
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
                <div class='flex max-w-sm flex-col'>
                  <span>{preset.name}</span>
                  {typeof preset.description === 'string' && preset.description.length > 0 ? (
                    <span class='text-xs wrap-break-word whitespace-normal text-muted-foreground'>
                      {preset.description}
                    </span>
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
      <TooltipTableHead
        class='text-center'
        label={m.calibration_thruster_pin_setup_pin_label()}
        tooltip={m.calibration_thruster_pin_setup_pin_tooltip()}
      />
      <TooltipTableHead
        label={m.calibration_thruster_pin_setup_identifier_label()}
        tooltip={m.calibration_thruster_pin_setup_identifier_tooltip()}
      />
      <TooltipTableHead
        label={m.calibration_thruster_pin_setup_spin_direction_label()}
        tooltip={m.calibration_thruster_pin_setup_spin_direction_tooltip()}
      />
      <TooltipTableHead
        label={m.calibration_thruster_pin_setup_test_label()}
        tooltip={m.calibration_thruster_pin_setup_test_tooltip()}
      />
      <TooltipTableHead
        class='text-right'
        label={m.calibration_thruster_pin_setup_rpm_label()}
        tooltip={m.calibration_thruster_pin_setup_rpm_tooltip()}
      />
      <TooltipTableHead
        class='text-right'
        label={m.calibration_thruster_pin_setup_signal_quality_label()}
        tooltip={m.calibration_thruster_pin_setup_signal_quality_tooltip()}
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
          <TableCell>
            <IdentifierSelect
              form={props.form}
              index={index()}
              zeroValue={props.zeroValue}
              identifierCollection={props.identifierCollection}
            />
          </TableCell>
          <TableCell>
            <SpinDirectionSelect form={props.form} index={index()} zeroValue={props.zeroValue} />
          </TableCell>
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
          <TableCell class='w-20 text-right'>
            <span class='font-mono'>
              {(rovTelemetryStore.thrusterSignalQualities[index()] ?? 0).toFixed(1)}%
            </span>
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
      form={props.form}
      identifierCollection={props.identifierCollection}
      zeroValue={props.zeroValue}
    />
  </Table>
);

export const CalibrationFormLayout: Component<LayoutProps> = (props) => (
  <props.form.AppForm>
    <props.form.Form class='mb-24'>
      <Fieldset>
        <FieldLegend>{m.calibration_thruster_pin_setup_title()}</FieldLegend>
        <p class='mb-4 text-sm text-muted-foreground'>
          {m.calibration_thruster_pin_setup_description()}
        </p>
        <PinSetupTable
          pinNumbers={props.pinNumbers}
          testDisabled={props.testDisabled}
          onTestThruster={props.onTestThruster}
          form={props.form}
          identifierCollection={props.identifierCollection}
          zeroValue={props.zeroValue}
        />
      </Fieldset>
      <Fieldset>
        <FieldLegend>{m.calibration_thruster_allocation_title()}</FieldLegend>
        <p class='mb-4 text-sm text-muted-foreground'>
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
          form={props.form}
        />
      </Fieldset>
      <props.form.AutoSubmit />
    </props.form.Form>
  </props.form.AppForm>
);

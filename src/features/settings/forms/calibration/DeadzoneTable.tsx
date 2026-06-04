import type { Accessor, Component, ComponentProps, JSXElement } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { Field, FieldError } from '@manafishrov/ui/field';
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
import AddIcon from '~icons/material-symbols/add';
import DeleteIcon from '~icons/material-symbols/delete-outline';

import * as m from '@/paraglide/messages';

import { DEADZONE_FIELD_STEP, NEGATIVE_ONE, ONE, THRUSTER_COLUMNS, ZERO } from './constants';
import { DeadzoneField } from './FieldRenderers';

type DeadzoneFieldForm = ComponentProps<typeof DeadzoneField>['form'];

type DeadzoneTableProps = {
  form: DeadzoneFieldForm;
};

type DeadzoneRowProps = {
  form: DeadzoneFieldForm;
  rowIndex: number;
  onRemove: () => void;
};

const EMPTY_DEADZONE_ROW = THRUSTER_COLUMNS.map(() => ZERO);

const DeadzoneHeader: Component = () => (
  <TableHeader>
    <TableRow>
      <TableHead class='w-12'>{m.calibration_thruster_allocation_identifier()}</TableHead>
      <For each={THRUSTER_COLUMNS}>
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
);

const DeadzoneRow: Component<DeadzoneRowProps> = (props) => (
  <TableRow aria-label={m.calibration_deadzone_avoidance_row_aria({ index: props.rowIndex + ONE })}>
    <TableCell class='text-center'>
      <Tooltip positioning={{ placement: 'top' }}>
        <TooltipTrigger
          asChild={(tooltipProps) => (
            <Button
              {...tooltipProps()}
              type='button'
              variant='ghost'
              size='icon'
              aria-label={m.calibration_deadzone_avoidance_remove_row()}
              onClick={props.onRemove}
            >
              <DeleteIcon class='size-4' />
            </Button>
          )}
        />
        <Portal>
          <TooltipPositioner>
            <TooltipContent>
              {m.calibration_deadzone_avoidance_remove_row()}
              <TooltipArrow />
            </TooltipContent>
          </TooltipPositioner>
        </Portal>
      </Tooltip>
    </TableCell>
    <For each={THRUSTER_COLUMNS}>
      {(_column, columnIndex): JSXElement => (
        <TableCell class='w-20'>
          <DeadzoneField
            form={props.form}
            rowIndex={props.rowIndex}
            columnIndex={columnIndex()}
            minimumValue={NEGATIVE_ONE}
            maximumValue={ONE}
            stepValue={DEADZONE_FIELD_STEP}
          />
        </TableCell>
      )}
    </For>
  </TableRow>
);

const DeadzoneRows: Component<{
  form: DeadzoneFieldForm;
  rows: Accessor<readonly number[][]>;
  onRemove: (index: number) => void;
}> = (props) => (
  <For each={props.rows()}>
    {(_row, rowIndex) => (
      <DeadzoneRow
        form={props.form}
        rowIndex={rowIndex()}
        onRemove={() => {
          props.onRemove(rowIndex());
        }}
      />
    )}
  </For>
);

export const DeadzoneTable: Component<DeadzoneTableProps> = (props) => (
  <props.form.AppField name='nullspaceVectors' mode='array'>
    {(field) => (
      <Field class='space-y-2' invalid={field().state.meta.errors.length > ZERO}>
        <Table class='border'>
          <DeadzoneHeader />
          <TableBody>
            <DeadzoneRows
              form={props.form}
              rows={() => field().state.value}
              onRemove={(index) => {
                field().removeValue(index);
              }}
            />
          </TableBody>
        </Table>
        <Show when={field().state.value.length === ZERO}>
          <p class='text-sm text-muted-foreground'>{m.calibration_deadzone_avoidance_empty()}</p>
        </Show>
        <FieldError errors={field().state.meta.errors} />
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            field().pushValue([...EMPTY_DEADZONE_ROW]);
          }}
        >
          <AddIcon class='size-4' />
          {m.calibration_deadzone_avoidance_add_row()}
        </Button>
      </Field>
    )}
  </props.form.AppField>
);

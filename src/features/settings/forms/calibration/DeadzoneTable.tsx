import type { Accessor, Component, ComponentProps, JSXElement } from 'solid-js';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPositioner,
  AlertDialogTitle,
} from '@manafishrov/ui/alert-dialog';
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
import { toast } from '@manafishrov/ui/toaster';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import { Portal } from 'solid-js/web';
import AddIcon from '~icons/material-symbols/add';
import CalculateIcon from '~icons/material-symbols/calculate';
import DeleteIcon from '~icons/material-symbols/delete-outline';

import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';

import { DEADZONE_FIELD_STEP, NEGATIVE_ONE, ONE, THRUSTER_COLUMNS, ZERO } from './constants';
import { DeadzoneField } from './FieldRenderers';
import { computeNullspaceFromAllocation } from './nullspaceComputation';

type DeadzoneFieldForm = ComponentProps<typeof DeadzoneField>['form'];

type DeadzoneTableProps = {
  form: DeadzoneFieldForm;
};

type DeadzoneRowProps = {
  form: DeadzoneFieldForm;
  rowIndex: number;
  onRemove: () => void;
};

type FieldCallbacks = {
  currentLength: number;
  removeValue: (idx: number) => void;
  pushValue: (vec: number[]) => void;
};

type NullspaceField = {
  state: { value: readonly number[][] };
  removeValue: (idx: number) => void;
  pushValue: (vec: number[]) => void;
};

const buildFieldCallbacks = (field: NullspaceField): FieldCallbacks => ({
  currentLength: field.state.value.length,
  removeValue: (idx): void => {
    field.removeValue(idx);
  },
  pushValue: (vec): void => {
    field.pushValue(vec);
  },
});

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

const replaceVectorsInField = (callbacks: FieldCallbacks, vectors: number[][]): void => {
  for (let idx = callbacks.currentLength - 1; idx >= ZERO; idx -= 1) {
    callbacks.removeValue(idx);
  }
  for (const vector of vectors) {
    callbacks.pushValue(vector);
  }
};

const applyNullspaceToField = (callbacks: FieldCallbacks): void => {
  const result = computeNullspaceFromAllocation(rovConfigStore.thrusterAllocation);
  if (result.type === 'no_vectors') {
    toast.create({ title: m.toasts_no_nullspace_vectors_found(), type: 'warning' });
    return;
  }
  if (result.type === 'error') {
    toast.create({ title: m.toasts_nullspace_computation_error(), type: 'error' });
    return;
  }
  replaceVectorsInField(callbacks, result.vectors);
};

const GenerateConfirmDialog: Component<{
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = (props) => (
  <AlertDialog
    open={props.open}
    onOpenChange={(details): void => {
      if (!details.open) {
        props.onCancel();
      }
    }}
  >
    <Portal>
      <AlertDialogOverlay class='rounded-2xl' />
      <AlertDialogPositioner>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.calibration_deadzone_avoidance_generate_confirm_title()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.calibration_deadzone_avoidance_generate_confirm_description()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={props.onCancel}>
              {m.calibration_deadzone_avoidance_generate_confirm_cancel()}
            </AlertDialogCancel>
            <AlertDialogAction variant='destructive' onClick={props.onConfirm}>
              {m.calibration_deadzone_avoidance_generate_confirm_proceed()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPositioner>
    </Portal>
  </AlertDialog>
);

type DeadzoneTableSectionProps = {
  form: DeadzoneFieldForm;
  values: Accessor<readonly number[][]>;
  onRemove: (index: number) => void;
  onAdd: () => void;
  onGenerate: () => void;
};

const DeadzoneTableSection: Component<DeadzoneTableSectionProps> = (props) => (
  <>
    <Table class='border'>
      <DeadzoneHeader />
      <TableBody>
        <DeadzoneRows form={props.form} rows={props.values} onRemove={props.onRemove} />
      </TableBody>
    </Table>
    <Show when={props.values().length === ZERO}>
      <p class='text-sm text-muted-foreground'>{m.calibration_deadzone_avoidance_empty()}</p>
    </Show>
    <Button type='button' variant='outline' onClick={props.onAdd}>
      <AddIcon class='size-4' />
      {m.calibration_deadzone_avoidance_add_row()}
    </Button>
    <Button type='button' variant='outline' onClick={props.onGenerate}>
      <CalculateIcon class='size-4' />
      {m.calibration_deadzone_avoidance_generate_row()}
    </Button>
  </>
);

export const DeadzoneTable: Component<DeadzoneTableProps> = (props) => {
  const [showConfirmDialog, setShowConfirmDialog] = createSignal(false);

  return (
    <props.form.AppField name='nullspaceVectors' mode='array'>
      {(field) => (
        <>
          <Field class='space-y-2' invalid={field().state.meta.errors.length > ZERO}>
            <DeadzoneTableSection
              form={props.form}
              values={() => field().state.value}
              onRemove={(index) => {
                field().removeValue(index);
              }}
              onAdd={() => {
                field().pushValue([...EMPTY_DEADZONE_ROW]);
              }}
              onGenerate={() => {
                if (field().state.value.length > ZERO) {
                  setShowConfirmDialog(true);
                } else {
                  applyNullspaceToField(buildFieldCallbacks(field()));
                }
              }}
            />
            <FieldError errors={field().state.meta.errors} />
          </Field>
          <GenerateConfirmDialog
            open={showConfirmDialog()}
            onConfirm={() => {
              setShowConfirmDialog(false);
              applyNullspaceToField(buildFieldCallbacks(field()));
            }}
            onCancel={() => {
              setShowConfirmDialog(false);
            }}
          />
        </>
      )}
    </props.form.AppField>
  );
};

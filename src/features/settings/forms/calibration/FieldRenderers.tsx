import type { JSXElement } from 'solid-js';

import { createListCollection } from '@ark-ui/solid/collection';
import { withForm } from '@manafishrov/ui/form';
import {
  Select,
  SelectContent,
  SelectControl,
  SelectIndicator,
  SelectItem,
  SelectList,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@manafishrov/ui/select';
import { Portal } from 'solid-js/web';

import * as m from '@/paraglide/messages';

import { CALIBRATION_FORM_DEFAULT_VALUES, identifierSchema, spinDirectionSchema } from './schema';

export const createIdentifierCollection = (
  thrusterIndices: readonly number[],
  oneValue: number,
): ReturnType<typeof createListCollection<{ value: string; label: string }>> =>
  createListCollection<{ value: string; label: string }>({
    items: thrusterIndices.map((index) => ({
      value: String(index),
      label: String(index + oneValue),
    })),
  });

const spinDirectionCollection = createListCollection<{ value: string; label: string }>({
  items: [
    { value: '1', label: m.calibration_thruster_pin_setup_spin_direction_normal() },
    { value: '-1', label: m.calibration_thruster_pin_setup_spin_direction_reversed() },
  ],
});

const IDENTIFIER_SELECT_DEFAULT_PROPS = {
  index: 0,
  zeroValue: 0,
  identifierCollection: createIdentifierCollection([0], 1),
};

const SPIN_DIRECTION_SELECT_DEFAULT_PROPS = {
  index: 0,
  zeroValue: 0,
};

const ALLOCATION_FIELD_DEFAULT_PROPS = {
  rowIndex: 0,
  columnIndex: 0,
  minimumValue: 0,
  maximumValue: 0,
  stepValue: 1,
};

export const IdentifierSelect = withForm({
  defaultValues: CALIBRATION_FORM_DEFAULT_VALUES,
  props: IDENTIFIER_SELECT_DEFAULT_PROPS,
  render: function IdentifierSelectRender(props) {
    return (
      <props.form.AppField name={`thrusterPinSetup.identifiers[${props.index}]`}>
        {(field) => (
          <Select
            class='w-16'
            collection={props.identifierCollection}
            value={[field().state.value]}
            onValueChange={(details): void => {
              const parsed = identifierSchema.safeParse(details.value[props.zeroValue]);
              if (parsed.success) {
                field().handleChange(parsed.data);
              }
            }}
            onBlur={() => {
              field().handleBlur();
            }}
            invalid={field().state.meta.errors.length > props.zeroValue}
          >
            <SelectControl>
              <SelectTrigger>
                <SelectValue />
                <SelectIndicator />
              </SelectTrigger>
            </SelectControl>
            <Portal>
              <SelectPositioner>
                <SelectContent>
                  <SelectList>
                    <For each={props.identifierCollection.items}>
                      {(item): JSXElement => <SelectItem item={item}>{item.label}</SelectItem>}
                    </For>
                  </SelectList>
                </SelectContent>
              </SelectPositioner>
            </Portal>
          </Select>
        )}
      </props.form.AppField>
    );
  },
});

export const SpinDirectionSelect = withForm({
  defaultValues: CALIBRATION_FORM_DEFAULT_VALUES,
  props: SPIN_DIRECTION_SELECT_DEFAULT_PROPS,
  render: function SpinDirectionSelectRender(props) {
    return (
      <props.form.AppField name={`thrusterPinSetup.spinDirections[${props.index}]`}>
        {(field) => (
          <Select
            class='w-28'
            collection={spinDirectionCollection}
            value={[field().state.value]}
            onValueChange={(details): void => {
              const parsed = spinDirectionSchema.safeParse(details.value[props.zeroValue]);
              if (parsed.success) {
                field().handleChange(parsed.data);
              }
            }}
            onBlur={() => {
              field().handleBlur();
            }}
            invalid={field().state.meta.errors.length > props.zeroValue}
          >
            <SelectControl>
              <SelectTrigger>
                <SelectValue />
                <SelectIndicator />
              </SelectTrigger>
            </SelectControl>
            <Portal>
              <SelectPositioner>
                <SelectContent>
                  <SelectList>
                    <For each={spinDirectionCollection.items}>
                      {(item): JSXElement => <SelectItem item={item}>{item.label}</SelectItem>}
                    </For>
                  </SelectList>
                </SelectContent>
              </SelectPositioner>
            </Portal>
          </Select>
        )}
      </props.form.AppField>
    );
  },
});

export const AllocationField = withForm({
  defaultValues: CALIBRATION_FORM_DEFAULT_VALUES,
  props: ALLOCATION_FIELD_DEFAULT_PROPS,
  render: function AllocationFieldRender(props) {
    return (
      <props.form.AppField name={`thrusterAllocation[${props.rowIndex}][${props.columnIndex}]`}>
        {(field) => (
          <field.NumberInputField
            class='px-1 text-center'
            inputMode='decimal'
            showTriggers={false}
            min={props.minimumValue}
            max={props.maximumValue}
            step={props.stepValue}
            allowOverflow={false}
            clampValueOnBlur
          />
        )}
      </props.form.AppField>
    );
  },
});

import type { Component } from 'solid-js';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { FieldLegend, Fieldset } from '@manafishrov/ui/field';

import * as m from '@/paraglide/messages';

import { MAX_PID_VALUE } from './constants';
import { FieldSuggestionActions } from './FieldSuggestionActions';

type DirectionFieldProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppField: any;
  name: string;
  label: string;
  description: string;
  defaultValue: number;
};

const DirectionField: Component<DirectionFieldProps> = ({
  AppField,
  name,
  label,
  description,
  defaultValue,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const Field = AppField;
  return (
    <Field name={name}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(field: any) => (
        <field.NumberInputField
          label={label}
          description={description}
          min={0}
          max={MAX_PID_VALUE}
          step={1}
          trailingAddon={
            <FieldSuggestionActions
              defaultValue={defaultValue}
              onChange={field().handleChange}
              label={`${label} ${m.regulator_direction_coefficients_title()}`}
            />
          }
        />
      )}
    </Field>
  );
};

type DirectionCoefficientsFieldsetProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppField: any;
};

export const DirectionCoefficientsFieldset: Component<DirectionCoefficientsFieldsetProps> = ({
  AppField,
}) => (
  <Fieldset>
    <FieldLegend>{m.regulator_direction_coefficients_title()}</FieldLegend>
    <p class='text-muted-foreground mb-4 text-sm'>
      {m.regulator_direction_coefficients_description()}
    </p>
    <div class='space-y-4'>
      <DirectionField
        AppField={AppField}
        name='surge'
        label={m.regulator_direction_coefficients_surge()}
        description={m.calibration_thruster_allocation_surge_tooltip()}
        defaultValue={0.8}
      />
      <DirectionField
        AppField={AppField}
        name='heave'
        label={m.regulator_direction_coefficients_heave()}
        description={m.calibration_thruster_allocation_heave_tooltip()}
        defaultValue={0.5}
      />
      <DirectionField
        AppField={AppField}
        name='sway'
        label={m.regulator_direction_coefficients_sway()}
        description={m.calibration_thruster_allocation_sway_tooltip()}
        defaultValue={0.35}
      />
    </div>
  </Fieldset>
);

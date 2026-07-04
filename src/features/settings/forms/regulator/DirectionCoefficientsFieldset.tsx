import { FieldLegend, Fieldset } from '@manafishrov/ui/field';
import { withForm } from '@manafishrov/ui/form';

import * as m from '@/paraglide/messages';

import { MAX_PID_VALUE } from './constants';
import { FieldSuggestionActions } from './FieldSuggestionActions';
import { REGULATOR_FORM_DEFAULT_VALUES } from './schema';

type DirectionName = 'surge' | 'heave' | 'sway';
type DirectionFieldProps = {
  name: DirectionName;
  label: string;
  description: string;
  defaultValue: number;
  hasSuggestions: boolean;
};

const DEFAULT_DIRECTION_FIELD_PROPS: DirectionFieldProps = {
  name: 'surge',
  label: '',
  description: '',
  defaultValue: 0,
  hasSuggestions: false,
};

const DirectionField = withForm({
  defaultValues: REGULATOR_FORM_DEFAULT_VALUES,
  props: DEFAULT_DIRECTION_FIELD_PROPS,
  render: (props) => (
    <props.form.AppField name={props.name}>
      {(field) => (
        <field.NumberInputField
          label={props.label}
          description={props.description}
          min={0}
          max={MAX_PID_VALUE}
          step={1}
          trailingAddon={
            <FieldSuggestionActions
              defaultValue={props.defaultValue}
              onChange={field().handleChange}
              label={`${props.label} ${m.regulator_direction_coefficients_title()}`}
            />
          }
        />
      )}
    </props.form.AppField>
  ),
});

export const DirectionCoefficientsFieldset = withForm({
  defaultValues: REGULATOR_FORM_DEFAULT_VALUES,
  props: {
    hasSuggestions: false,
  },
  render: (props) => (
    <Fieldset>
      <FieldLegend>{m.regulator_direction_coefficients_title()}</FieldLegend>
      <p class='mb-4 text-sm text-muted-foreground'>
        {m.regulator_direction_coefficients_description()}
      </p>
      <div class='space-y-4'>
        <DirectionField
          form={props.form}
          name='surge'
          label={m.regulator_direction_coefficients_surge()}
          description={m.calibration_thruster_allocation_surge_tooltip()}
          defaultValue={REGULATOR_FORM_DEFAULT_VALUES.surge}
          hasSuggestions={props.hasSuggestions}
        />
        <DirectionField
          form={props.form}
          name='heave'
          label={m.regulator_direction_coefficients_heave()}
          description={m.calibration_thruster_allocation_heave_tooltip()}
          defaultValue={REGULATOR_FORM_DEFAULT_VALUES.heave}
          hasSuggestions={props.hasSuggestions}
        />
        <DirectionField
          form={props.form}
          name='sway'
          label={m.regulator_direction_coefficients_sway()}
          description={m.calibration_thruster_allocation_sway_tooltip()}
          defaultValue={REGULATOR_FORM_DEFAULT_VALUES.sway}
          hasSuggestions={props.hasSuggestions}
        />
      </div>
    </Fieldset>
  ),
});

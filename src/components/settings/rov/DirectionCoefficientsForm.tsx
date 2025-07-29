import { useStore } from '@tanstack/react-store';
import { useEffect } from 'react';
import { z } from 'zod';

import { RegulatorFieldButtons } from '@/components/settings/rov/RegulatorFieldButtons';
import { useAppForm } from '@/components/ui/Form';

import { rovConfigStore, setRovConfig } from '@/stores/rovConfig';

const formSchema = z.object({
  horizontal: z
    .number()
    .min(0, 'Must be at least 0')
    .max(100, 'Must be at most 100'),
  strafe: z
    .number()
    .min(0, 'Must be at least 0')
    .max(100, 'Must be at most 100'),
  vertical: z
    .number()
    .min(0, 'Must be at least 0')
    .max(100, 'Must be at most 100'),
  pitch: z
    .number()
    .min(0, 'Must be at least 0')
    .max(100, 'Must be at most 100'),
  yaw: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
  roll: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
});

function DirectionCoefficientsForm() {
  const directionCoefficients = useStore(
    rovConfigStore,
    (state) => state?.directionCoefficients,
  );

  const form = useAppForm({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      horizontal: directionCoefficients?.horizontal ?? 0,
      strafe: directionCoefficients?.strafe ?? 0,
      vertical: directionCoefficients?.vertical ?? 0,
      pitch: directionCoefficients?.pitch ?? 0,
      yaw: directionCoefficients?.yaw ?? 0,
      roll: directionCoefficients?.roll ?? 0,
    },
    onSubmit: ({ value }) => setRovConfig({ directionCoefficients: value }),
  });

  useEffect(() => {
    if (directionCoefficients) {
      form.reset({
        horizontal: directionCoefficients.horizontal,
        strafe: directionCoefficients.strafe,
        vertical: directionCoefficients.vertical,
        pitch: directionCoefficients.pitch,
        yaw: directionCoefficients.yaw,
        roll: directionCoefficients.roll,
      });
    }
  }, [directionCoefficients, form]);

  return (
    <>
      <div>
        <h3 className='text-2xl font-semibold tracking-tight'>
          Direction Coefficients
        </h3>
        <p className='text-muted-foreground text-sm'>
          Set the relative power for moving or turning in each direction. The{' '}
          <b>ratios</b> between these values determine how much force each
          thruster will use to move in the expected direction without drifting.
          The units don’t matter as long as all axes use the same units.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className='relative space-y-4'
      >
        <form.AppForm>
          <form.AppField name='horizontal'>
            {(field) => (
              <field.NumberField
                label='Horizontal'
                fieldSuffix={
                  <RegulatorFieldButtons
                    defaultValue={0.8}
                    onChange={field.handleChange}
                    label='Horizontal Direction Coefficient'
                  />
                }
              />
            )}
          </form.AppField>
          <form.AppField name='strafe'>
            {(field) => (
              <field.NumberField
                label='Strafe'
                fieldSuffix={
                  <RegulatorFieldButtons
                    defaultValue={0.35}
                    onChange={field.handleChange}
                    label='Strafe Direction Coefficient'
                  />
                }
              />
            )}
          </form.AppField>
          <form.AppField name='vertical'>
            {(field) => (
              <field.NumberField
                label='Vertical'
                fieldSuffix={
                  <RegulatorFieldButtons
                    defaultValue={0.5}
                    onChange={field.handleChange}
                    label='Vertial Direction Coefficient'
                  />
                }
              />
            )}
          </form.AppField>
          <form.AppField name='pitch'>
            {(field) => (
              <field.NumberField
                label='Pitch'
                fieldSuffix={
                  <RegulatorFieldButtons
                    defaultValue={0.4}
                    onChange={field.handleChange}
                    label='Pitch Direction Coefficient'
                  />
                }
              />
            )}
          </form.AppField>
          <form.AppField name='yaw'>
            {(field) => (
              <field.NumberField
                label='Yaw'
                fieldSuffix={
                  <RegulatorFieldButtons
                    defaultValue={0.3}
                    onChange={field.handleChange}
                    label='Yaw Direction Coefficient'
                  />
                }
              />
            )}
          </form.AppField>
          <form.AppField name='roll'>
            {(field) => (
              <field.NumberField
                label='Roll'
                fieldSuffix={
                  <RegulatorFieldButtons
                    defaultValue={0.8}
                    onChange={field.handleChange}
                    label='Roll Direction Coefficient'
                  />
                }
              />
            )}
          </form.AppField>
          <form.SubmitButton className='w-60'>
            Update Direction Coefficients
          </form.SubmitButton>
        </form.AppForm>
      </form>
    </>
  );
}

export { DirectionCoefficientsForm };

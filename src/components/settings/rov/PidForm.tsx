import { useStore } from '@tanstack/react-store';
import { useEffect } from 'react';
import { z } from 'zod';

import { RegulatorFieldButtons } from '@/components/settings/rov/RegulatorFieldButtons';
import { Button } from '@/components/ui/Button';
import { useAppForm } from '@/components/ui/Form';

import { useRegulatorSuggestionsListener } from '@/hooks/useRegulatorSuggestionsListener';

import { rovConfigStore, setRovConfig } from '@/stores/rovConfig';

const pidSchema = z.object({
  kp: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
  ki: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
  kd: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
});

const formSchema = z.object({
  turnSpeed: z
    .number()
    .min(0, 'Must be at least 0')
    .max(360, 'Must be at most 360'),
  pitch: pidSchema,
  roll: pidSchema,
  depth: pidSchema,
});

function PidForm() {
  const regulator = useStore(rovConfigStore, (state) => state?.regulator);
  const regulatorSuggestions = useRegulatorSuggestionsListener();

  const form = useAppForm({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
      turnSpeed: regulator?.turnSpeed ?? 0,
      pitch: {
        kp: regulator?.pitch.kp ?? 0,
        ki: regulator?.pitch.ki ?? 0,
        kd: regulator?.pitch.kd ?? 0,
      },
      roll: {
        kp: regulator?.roll.kp ?? 0,
        ki: regulator?.roll.ki ?? 0,
        kd: regulator?.roll.kd ?? 0,
      },
      depth: {
        kp: regulator?.depth.kp ?? 0,
        ki: regulator?.depth.ki ?? 0,
        kd: regulator?.depth.kd ?? 0,
      },
    },
    onSubmit: ({ value }) => setRovConfig({ regulator: value }),
  });

  useEffect(() => {
    if (regulator) {
      form.reset({
        turnSpeed: regulator.turnSpeed,
        pitch: {
          kp: regulator.pitch.kp,
          ki: regulator.pitch.ki,
          kd: regulator.pitch.kd,
        },
        roll: {
          kp: regulator.roll.kp,
          ki: regulator.roll.ki,
          kd: regulator.roll.kd,
        },
        depth: {
          kp: regulator.depth.kp,
          ki: regulator.depth.ki,
          kd: regulator.depth.kd,
        },
      });
    }
  }, [regulator, form]);

  return (
    <>
      <div>
        <h3 className='text-2xl font-semibold tracking-tight'>
          PID (Proportional-Integral-Derivative) controller
        </h3>
        <p className='text-muted-foreground text-sm'>
          Use this page to fine-tune how your ROV responds to movement commands.
          Adjust the Kp, Ki, and Kd values for pitch, roll, and depth to control
          how strongly and smoothly the ROV corrects its position. Enter your
          own values or run auto-tuning when the ROV is in still water to
          automatically determine sane defaults.
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
          <form.AppField name='turnSpeed'>
            {(field) => (
              <field.NumberField
                label='Turn Speed'
                description='The speed of which the ROV will try to reach the desired position by the PID controller.'
                fieldSuffix={
                  <RegulatorFieldButtons
                    defaultValue={40}
                    onChange={field.handleChange}
                    label='Turn Speed'
                  />
                }
              />
            )}
          </form.AppField>
          <div>
            <h4 className='text-lg font-medium'>Pitch</h4>
            <p className='text-muted-foreground mb-2 text-xs'>
              Controls nose up/down.
            </p>
            <div className='space-y-4'>
              <form.AppField name='pitch.kp'>
                {(field) => (
                  <field.NumberField
                    label='Kp'
                    fieldSuffix={
                      <RegulatorFieldButtons
                        defaultValue={5}
                        suggestionValue={regulatorSuggestions?.pitch.kp}
                        onChange={field.handleChange}
                        label='Pitch Kp'
                      />
                    }
                  />
                )}
              </form.AppField>
              <form.AppField name='pitch.ki'>
                {(field) => (
                  <field.NumberField
                    label='Ki'
                    fieldSuffix={
                      <RegulatorFieldButtons
                        defaultValue={0.5}
                        suggestionValue={regulatorSuggestions?.pitch.ki}
                        onChange={field.handleChange}
                        label='Pitch Ki'
                      />
                    }
                  />
                )}
              </form.AppField>
              <form.AppField name='pitch.kd'>
                {(field) => (
                  <field.NumberField
                    label='Kd'
                    fieldSuffix={
                      <RegulatorFieldButtons
                        defaultValue={1}
                        suggestionValue={regulatorSuggestions?.pitch.kd}
                        onChange={field.handleChange}
                        label='Pitch Kd'
                      />
                    }
                  />
                )}
              </form.AppField>
            </div>
          </div>
          <div>
            <h4 className='text-lg font-medium'>Roll</h4>
            <p className='text-muted-foreground mb-2 text-xs'>
              Controls side-to-side tilt.
            </p>
            <div className='space-y-4'>
              <form.AppField name='roll.kp'>
                {(field) => (
                  <field.NumberField
                    label='Kp'
                    fieldSuffix={
                      <RegulatorFieldButtons
                        defaultValue={1.5}
                        suggestionValue={regulatorSuggestions?.roll.kp}
                        onChange={field.handleChange}
                        label='Roll Kp'
                      />
                    }
                  />
                )}
              </form.AppField>
              <form.AppField name='roll.ki'>
                {(field) => (
                  <field.NumberField
                    label='Ki'
                    fieldSuffix={
                      <RegulatorFieldButtons
                        defaultValue={0.1}
                        suggestionValue={regulatorSuggestions?.roll.ki}
                        onChange={field.handleChange}
                        label='Roll Ki'
                      />
                    }
                  />
                )}
              </form.AppField>
              <form.AppField name='roll.kd'>
                {(field) => (
                  <field.NumberField
                    label='Kd'
                    fieldSuffix={
                      <RegulatorFieldButtons
                        defaultValue={0.4}
                        suggestionValue={regulatorSuggestions?.roll.kd}
                        onChange={field.handleChange}
                        label='Roll Kd'
                      />
                    }
                  />
                )}
              </form.AppField>
            </div>
          </div>
          <div>
            <h4 className='text-lg font-medium'>Depth</h4>
            <p className='text-muted-foreground mb-2 text-xs'>
              Controls vertical movement.
            </p>
            <div className='space-y-4'>
              <form.AppField name='depth.kp'>
                {(field) => (
                  <field.NumberField
                    label='Kp'
                    fieldSuffix={
                      <RegulatorFieldButtons
                        defaultValue={0}
                        suggestionValue={regulatorSuggestions?.depth.kp}
                        onChange={field.handleChange}
                        label='Depth Kp'
                      />
                    }
                  />
                )}
              </form.AppField>
              <form.AppField name='depth.ki'>
                {(field) => (
                  <field.NumberField
                    label='Ki'
                    fieldSuffix={
                      <RegulatorFieldButtons
                        defaultValue={0.05}
                        suggestionValue={regulatorSuggestions?.depth.ki}
                        onChange={field.handleChange}
                        label='Depth Ki'
                      />
                    }
                  />
                )}
              </form.AppField>
              <form.AppField name='depth.kd'>
                {(field) => (
                  <field.NumberField
                    label='Kd'
                    fieldSuffix={
                      <RegulatorFieldButtons
                        defaultValue={0.1}
                        suggestionValue={regulatorSuggestions?.depth.kd}
                        onChange={field.handleChange}
                        label='Depth Kd'
                      />
                    }
                  />
                )}
              </form.AppField>
            </div>
          </div>
          <div className='flex items-center gap-4'>
            <form.SubmitButton className='w-44'>
              Update Regulator PID
            </form.SubmitButton>
            <Button className='w-44' variant='outline'>
              Run Auto Tuning
            </Button>
          </div>
        </form.AppForm>
      </form>
    </>
  );
}

export { PidForm };

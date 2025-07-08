import { useStore } from '@tanstack/react-store';
import { useEffect } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { useAppForm } from '@/components/ui/Form';

import { droneConfigStore, regulatorUpdate } from '@/stores/droneConfigStore';
import { settingsStateStore } from '@/stores/settingsStateStore';

const pidSchema = z.object({
  kp: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
  ki: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
  kd: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
});

const formSchema = z.object({
  pitch: pidSchema,
  roll: pidSchema,
  depth: pidSchema,
});

function PidForm() {
  const { regulator } = useStore(droneConfigStore);
  const { regulatorSuggestions } = useStore(settingsStateStore);

  const form = useAppForm({
    validators: {
      onSubmit: formSchema,
    },
    defaultValues: {
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
    onSubmit: ({ value }) => regulatorUpdate(value),
  });

  useEffect(() => {
    if (regulator) {
      form.reset({
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
      <h3 className='text-2xl font-semibold tracking-tight'>
        PID (Proportional-Integral-Derivative) controller
      </h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className='relative grow space-y-8'
      >
        <form.AppForm>
          <div>
            <h4 className='text-lg font-medium'>Pitch</h4>
            <div className='space-y-4'>
              <form.AppField name='pitch.kp'>
                {(field) => (
                  <div className='flex items-center gap-4'>
                    <field.NumberField label='Kp' placeholder='1' />
                    <span className='text-muted-foreground text-sm'>
                      {regulatorSuggestions &&
                        `Auto-tuning suggestion: ${regulatorSuggestions.pitch.kp}`}
                    </span>
                  </div>
                )}
              </form.AppField>
              <form.AppField name='pitch.ki'>
                {(field) => (
                  <div className='flex items-center gap-4'>
                    <field.NumberField label='Ki' placeholder='1' />
                    <span className='text-muted-foreground text-sm'>
                      {regulatorSuggestions &&
                        `Auto-tuning suggestion: ${regulatorSuggestions.pitch.ki}`}
                    </span>
                  </div>
                )}
              </form.AppField>
              <form.AppField name='pitch.kd'>
                {(field) => (
                  <div className='flex items-center gap-4'>
                    <field.NumberField label='Kd' placeholder='1' />
                    <span className='text-muted-foreground text-sm'>
                      {regulatorSuggestions &&
                        `Auto-tuning suggestion: ${regulatorSuggestions.pitch.kd}`}
                    </span>
                  </div>
                )}
              </form.AppField>
            </div>
          </div>
          <div>
            <h4 className='text-lg font-medium'>Roll</h4>
            <div className='space-y-4'>
              <form.AppField name='roll.kp'>
                {(field) => (
                  <div className='flex items-center gap-4'>
                    <field.NumberField label='Kp' placeholder='1' />
                    <span className='text-muted-foreground text-sm'>
                      {regulatorSuggestions &&
                        `Auto-tuning suggestion: ${regulatorSuggestions.roll.kp}`}
                    </span>
                  </div>
                )}
              </form.AppField>
              <form.AppField name='roll.ki'>
                {(field) => (
                  <div className='flex items-center gap-4'>
                    <field.NumberField label='Ki' placeholder='1' />
                    <span className='text-muted-foreground text-sm'>
                      {regulatorSuggestions &&
                        `Auto-tuning suggestion: ${regulatorSuggestions.roll.ki}`}
                    </span>
                  </div>
                )}
              </form.AppField>
              <form.AppField name='roll.kd'>
                {(field) => (
                  <div className='flex items-center gap-4'>
                    <field.NumberField label='Kd' placeholder='1' />
                    <span className='text-muted-foreground text-sm'>
                      {regulatorSuggestions &&
                        `Auto-tuning suggestion: ${regulatorSuggestions.roll.kd}`}
                    </span>
                  </div>
                )}
              </form.AppField>
            </div>
          </div>
          <div>
            <h4 className='text-lg font-medium'>Depth</h4>
            <div className='space-y-4'>
              <form.AppField name='depth.kp'>
                {(field) => (
                  <div className='flex items-center gap-4'>
                    <field.NumberField label='Kp' placeholder='1' />
                    <span className='text-muted-foreground text-sm'>
                      {regulatorSuggestions &&
                        `Auto-tuning suggestion: ${regulatorSuggestions.depth.kp}`}
                    </span>
                  </div>
                )}
              </form.AppField>
              <form.AppField name='depth.ki'>
                {(field) => (
                  <div className='flex items-center gap-4'>
                    <field.NumberField label='Ki' placeholder='1' />
                    <span className='text-muted-foreground text-sm'>
                      {regulatorSuggestions &&
                        `Auto-tuning suggestion: ${regulatorSuggestions.depth.ki}`}
                    </span>
                  </div>
                )}
              </form.AppField>
              <form.AppField name='depth.kd'>
                {(field) => (
                  <div className='flex items-center gap-4'>
                    <field.NumberField label='Kd' placeholder='1' />
                    <span className='text-muted-foreground text-sm'>
                      {regulatorSuggestions &&
                        `Auto-tuning suggestion: ${regulatorSuggestions.depth.kd}`}
                    </span>
                  </div>
                )}
              </form.AppField>
            </div>
          </div>
          <div className='flex items-center gap-4'>
            <form.SubmitButton>Update Regulator PID</form.SubmitButton>
            <Button variant='outline'>Run Auto Tuning</Button>
          </div>
        </form.AppForm>
      </form>
    </>
  );
}

export { PidForm };

import { useStore } from '@tanstack/react-store';
import { useEffect } from 'react';
import { z } from 'zod';

import { useAppForm } from '@/components/ui/Form';

import { droneConfigStore } from '@/stores/droneConfigStore';

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
    onSubmit: ({ value }) => {},
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

  if (!regulator) return;

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
          <form.AppField name='ipAddress'>
            {(field) => (
              <field.TextField
                label='IP address'
                placeholder='10.10.10.10'
                description='The IP address of your Manafish.'
              />
            )}
          </form.AppField>
          <form.SubmitButton>Save</form.SubmitButton>
        </form.AppForm>
      </form>
    </>
  );
}

export { PidForm };

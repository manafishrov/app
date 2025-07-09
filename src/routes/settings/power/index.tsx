import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/power/')({
  component: Power,
});

function Power() {
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Power</h1>
        <p className='text-muted-foreground'>
          Configure your Manafish power and battery settings.
        </p>
      </div>
    </>
  );
}

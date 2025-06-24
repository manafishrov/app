import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/regulator/')({
  component: Regulator,
});

function Regulator() {
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Regulator</h1>
        <p className='text-muted-foreground'>
          Adjust the regulator settings for the ROV.
        </p>
      </div>
    </>
  );
}

import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/debug/')({
  component: Debug,
});

function Debug() {
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>Debug</h1>
        <p className='text-muted-foreground'>
          Debug consoles for the ROV and the application.
        </p>
      </div>
    </>
  );
}

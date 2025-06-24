import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/')({
  component: General,
});

function General() {
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>General</h1>
        <p className='text-muted-foreground'>
          Generic settings for the Manafish application.
        </p>
      </div>
    </>
  );
}

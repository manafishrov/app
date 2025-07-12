import { createFileRoute } from '@tanstack/react-router';

import { requestRovConfig } from '@/stores/rovConfig';

export const Route = createFileRoute('/settings/general/')({
  component: General,
  loader: requestRovConfig,
});

function General() {
  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>General</h1>
        <p className='text-muted-foreground'>
          Generic settings for the Manafish ROV.
        </p>
      </div>
    </>
  );
}

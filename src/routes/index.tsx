import { createFileRoute } from '@tanstack/react-router';

import { VideoStream } from '@/components/VideoStream';

import { useControlInput } from '@/hooks/useControlInput';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  useControlInput();
  return (
    <main className='mx-auto flex h-full w-full flex-col gap-2 p-4'>
      <VideoStream />
    </main>
  );
}

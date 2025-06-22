import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/')({
  component: General,
});

function General() {
  return <main>general</main>;
}

import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/debug/')({
  component: Debug,
});

function Debug() {
  return <main>debug</main>;
}

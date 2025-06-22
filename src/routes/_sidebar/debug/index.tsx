import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_sidebar/debug/')({
  component: Debug,
});

function Debug() {
  return <main>debug</main>;
}

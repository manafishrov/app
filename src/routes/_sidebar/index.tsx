import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_sidebar/')({
  component: General,
});

function General() {
  return <main>general</main>;
}

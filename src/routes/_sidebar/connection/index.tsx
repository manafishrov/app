import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_sidebar/connection/')({
  component: Connection,
});

function Connection() {
  return <main>connection</main>;
}

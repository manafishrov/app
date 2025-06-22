import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_sidebar/regulator/')({
  component: Regulator,
});

function Regulator() {
  return <main>regulator</main>;
}

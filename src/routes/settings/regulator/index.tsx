import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/regulator/')({
  component: Regulator,
});

function Regulator() {
  return <main>regulator</main>;
}

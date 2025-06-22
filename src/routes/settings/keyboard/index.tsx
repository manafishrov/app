import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/keyboard/')({
  component: Keyboard,
});

function Keyboard() {
  return <main>keyboard</main>;
}

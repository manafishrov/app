import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/gamepad/')({
  component: Gamepad,
});

function Gamepad() {
  return <main>gamepad</main>;
}

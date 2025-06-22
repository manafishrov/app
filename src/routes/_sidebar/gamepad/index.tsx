import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_sidebar/gamepad/')({
  component: Gamepad,
});

function Gamepad() {
  return <main>gamepad</main>;
}

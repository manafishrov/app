import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_sidebar/keyboard/')({
  component: Keyboard,
});

function Keyboard() {
  return <main>keyboard</main>;
}

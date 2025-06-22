import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/calibration/')({
  component: Calibration,
});

function Calibration() {
  return <main>calibration</main>;
}

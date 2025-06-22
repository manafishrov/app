import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_sidebar/calibration/')({
  component: Calibration,
});

function Calibration() {
  return <main>calibration</main>;
}

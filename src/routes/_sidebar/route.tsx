import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_sidebar')({
  component: SidebarLayout,
});

function SidebarLayout() {
  return <Outlet />;
}

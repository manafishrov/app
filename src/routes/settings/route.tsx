import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings')({
  component: SidebarLayout,
});

function SidebarLayout() {
  return <Outlet />;
}

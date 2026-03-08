export function disableContextMenu(): (() => void) | undefined {
  if (!import.meta.env.PROD) return;

  const handleContextMenu = (e: MouseEvent) => e.preventDefault();
  document.addEventListener('contextmenu', handleContextMenu);

  return () => document.removeEventListener('contextmenu', handleContextMenu);
}

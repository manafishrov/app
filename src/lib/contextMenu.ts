const handleContextMenu = (event: MouseEvent): void => {
  event.preventDefault();
};

export const disableContextMenu = (): (() => void) | undefined => {
  if (!import.meta.env.PROD) {
    return;
  }

  document.addEventListener('contextmenu', handleContextMenu);

  return () => {
    document.removeEventListener('contextmenu', handleContextMenu);
  };
};

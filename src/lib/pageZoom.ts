const ZOOM_KEYS = new Set(['+', '=', '-', '0']);

const preventZoomShortcut = (event: KeyboardEvent): void => {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && ZOOM_KEYS.has(event.key)) {
    event.preventDefault();
  }
};

const preventZoomWheel = (event: WheelEvent): void => {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
  }
};

const preventZoomGesture = (event: Event): void => {
  event.preventDefault();
};

export const disablePageZoom = (): (() => void) => {
  const options: AddEventListenerOptions = { capture: true, passive: false };
  document.addEventListener('keydown', preventZoomShortcut, options);
  document.addEventListener('wheel', preventZoomWheel, options);
  document.addEventListener('gesturestart', preventZoomGesture, options);
  document.addEventListener('gesturechange', preventZoomGesture, options);

  return () => {
    document.removeEventListener('keydown', preventZoomShortcut, options);
    document.removeEventListener('wheel', preventZoomWheel, options);
    document.removeEventListener('gesturestart', preventZoomGesture, options);
    document.removeEventListener('gesturechange', preventZoomGesture, options);
  };
};

/*
 * Tracks the single pointer that started on a control, even after it slides
 * off, so two thumbs can drive two controls at once.
 */
export type PointerDragHandlers = {
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerCancel: (event: PointerEvent) => void;
  onLostPointerCapture: (event: PointerEvent) => void;
};

const NO_POINTER = -1;

export const createPointerDrag = (
  onMove: (event: PointerEvent, element: HTMLElement) => void,
  onRelease: () => void,
): PointerDragHandlers => {
  let activePointer = NO_POINTER;

  const release = (event: PointerEvent): void => {
    if (event.pointerId !== activePointer) {
      return;
    }
    activePointer = NO_POINTER;
    onRelease();
  };

  return {
    onPointerDown: (event) => {
      if (activePointer !== NO_POINTER || !(event.currentTarget instanceof HTMLElement)) {
        return;
      }
      event.preventDefault();
      activePointer = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      onMove(event, event.currentTarget);
    },
    onPointerMove: (event) => {
      if (event.pointerId === activePointer && event.currentTarget instanceof HTMLElement) {
        onMove(event, event.currentTarget);
      }
    },
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
  };
};

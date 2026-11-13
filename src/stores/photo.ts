import { createStore } from 'solid-js/store';

type PhotoState = {
  /** From the button press until the ROV has the frame and the video runs again. */
  isCapturing: boolean;
  /** Bumped on every shutter press; the video plays one flash per change. */
  flashCount: number;
};

const [photoStore, setPhotoStore] = createStore<PhotoState>({
  isCapturing: false,
  flashCount: 0,
});

export { photoStore, setPhotoStore, type PhotoState };

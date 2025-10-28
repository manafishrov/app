import { Store } from '@tanstack/react-store';

type RecordingState = {
  isRecording: boolean;
  startTime: number | null;
};

const recordingStore = new Store<RecordingState>({
  isRecording: false,
  startTime: null,
});

function setRecordingState(newState: Partial<RecordingState>) {
  recordingStore.setState((prev) => ({ ...prev, ...newState }));
}

function getDuration() {
  const state = recordingStore.state;
  return state.isRecording && state.startTime
    ? Date.now() - state.startTime
    : 0;
}

export { recordingStore, setRecordingState, getDuration, type RecordingState };

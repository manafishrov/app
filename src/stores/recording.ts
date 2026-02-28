import { createStore } from 'solid-js/store';

type RecordingState = {
  isRecording: boolean;
  startTime: number | null;
  webrtcConnected: boolean;
};

const defaultRecordingState: RecordingState = {
  isRecording: false,
  startTime: null,
  webrtcConnected: false,
};

const [recordingStore, setRecordingStore] = createStore<RecordingState>(defaultRecordingState);

function setRecordingState(newState: Partial<RecordingState>) {
  setRecordingStore(newState);
}

function getDuration() {
  return recordingStore.isRecording && recordingStore.startTime
    ? Date.now() - recordingStore.startTime
    : 0;
}

export { recordingStore, setRecordingStore, setRecordingState, getDuration, type RecordingState };

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

const getDuration = () => {
  return recordingStore.isRecording && recordingStore.startTime
    ? Date.now() - recordingStore.startTime
    : 0;
};

export { recordingStore, setRecordingStore, getDuration, type RecordingState };

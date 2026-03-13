import { createStore } from 'solid-js/store';

type RecordingState = {
  isRecording: boolean;
  startTime: number | undefined;
  webrtcConnected: boolean;
};

const [undef] = [] as (number | undefined)[];

const defaultRecordingState: RecordingState = {
  isRecording: false,
  startTime: undef,
  webrtcConnected: false,
};

const [recordingStore, setRecordingStore] = createStore<RecordingState>(defaultRecordingState);

const getDuration = (): number =>
  recordingStore.isRecording && (recordingStore.startTime ?? 0) > 0
    ? Date.now() - (recordingStore.startTime ?? 0)
    : 0;

export { recordingStore, setRecordingStore, getDuration, type RecordingState };

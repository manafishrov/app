import { setRecordingStore } from '@/stores/recording';

type RecordingToggleState = { record: boolean };

type RecordingToggleArgs = {
  isPressed: boolean;
  lastState: RecordingToggleState;
  getIsRecording: () => boolean;
  getWebrtcConnected: () => boolean;
};

const [undefinedNumber] = [] as (number | undefined)[];

export const handleRecordingToggle = (args: RecordingToggleArgs): void => {
  const isRecording = args.getIsRecording();
  const webrtcConnected = args.getWebrtcConnected();
  if (args.isPressed && !args.lastState.record && webrtcConnected) {
    const startTime = isRecording ? undefinedNumber : Date.now();
    setRecordingStore({ isRecording: !isRecording, startTime });
    args.lastState.record = true;
  } else if (!args.isPressed) {
    args.lastState.record = false;
  }
};

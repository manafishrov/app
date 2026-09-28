import { Channel, invoke } from '@tauri-apps/api/core';

export type PythonEditorSession = {
  id: number;
  rootUri: string;
  documentUri: string;
  sdkStatus: 'current' | 'cached' | 'missing';
};
type EditorEvent = { type: 'message' | 'stopped'; message: string };

export const startPythonEditor = (
  onMessage: (message: string) => void,
  onStopped: (message: string) => void,
): Promise<PythonEditorSession> => {
  const events = new Channel<EditorEvent>();
  // oxlint-disable-next-line unicorn/prefer-add-event-listener -- Tauri channels expose onmessage only.
  events.onmessage = (event): void => {
    if (event.type === 'message') {
      onMessage(event.message);
    } else {
      onStopped(event.message);
    }
  };
  return invoke<PythonEditorSession>('start_python_editor', { events });
};
export const sendPythonEditor = (id: number, message: string): Promise<void> =>
  invoke('send_python_editor', { id, message });
export const stopPythonEditor = (id: number): Promise<void> => invoke('stop_python_editor', { id });

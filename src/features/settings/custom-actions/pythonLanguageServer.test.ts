// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PythonEditorSession } from '@/tauri/pythonEditor';

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(() => Promise.resolve()),
  send: vi.fn(() => Promise.resolve()),
  warn: vi.fn(),
}));
vi.mock('@/tauri/pythonEditor', () => ({
  startPythonEditor: mocks.start,
  stopPythonEditor: mocks.stop,
  sendPythonEditor: mocks.send,
}));
vi.mock('@/lib/log', () => ({ logWarn: mocks.warn }));

import { connectPythonLanguageServer } from './pythonLanguageServer';

const session: PythonEditorSession = {
  id: 7,
  rootUri: 'file:///analysis/',
  documentUri: 'file:///analysis/custom_action.py',
  sdkStatus: 'current',
};
const flush = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
afterEach(() => {
  vi.clearAllMocks();
});

describe('Python analysis lifecycle', () => {
  it('stops late startup after the editor has unmounted', () => {
    const resolveStart = vi.fn<(value: PythonEditorSession) => void>();
    mocks.start.mockReturnValue(
      new Promise<PythonEditorSession>((resolve) => {
        resolveStart.mockImplementation(resolve);
      }),
    );
    const install = vi.fn();
    const dispose = connectPythonLanguageServer(install, vi.fn());
    dispose();
    resolveStart(session);
    return flush().then(() => {
      expect(mocks.stop).toHaveBeenCalledWith(session.id);
      expect(mocks.send).not.toHaveBeenCalled();
      expect(install).not.toHaveBeenCalled();
    });
  });

  it('reports startup failures while leaving the editor usable', () => {
    mocks.start.mockRejectedValue(new Error('missing executable'));
    const status = vi.fn();
    const install = vi.fn();
    const dispose = connectPythonLanguageServer(install, status);
    return flush().then(() => {
      expect(status).toHaveBeenLastCalledWith('failed');
      expect(install).toHaveBeenCalledWith([]);
      expect(mocks.warn).toHaveBeenCalled();
      dispose();
    });
  });
});

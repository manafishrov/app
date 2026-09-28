import type { Extension } from '@codemirror/state';

import {
  LSPClient,
  serverCompletion,
  serverDiagnostics,
  hoverTooltips,
  signatureHelp,
} from '@codemirror/lsp-client';
import DOMPurify from 'dompurify';

import { logWarn } from '@/lib/log';
import {
  startPythonEditor,
  sendPythonEditor,
  stopPythonEditor,
  type PythonEditorSession,
} from '@/tauri/pythonEditor';

import { pythonDiagnostics } from './pythonDiagnostics';

export type AnalysisStatus = 'starting' | 'ready' | 'missingSdk' | 'cachedSdk' | 'failed';
const REQUEST_TIMEOUT = 10_000;

class PythonLanguageServer {
  private disposed = false;
  private failed = false;
  private id: number | null = null;
  private client: LSPClient | null = null;
  private sending = Promise.resolve();
  private readonly listeners = new Set<(message: string) => void>();
  private readonly install: (extension: Extension) => void;
  private readonly status: (status: AnalysisStatus) => void;
  constructor(install: (extension: Extension) => void, status: (status: AnalysisStatus) => void) {
    this.install = install;
    this.status = status;
  }

  start(): void {
    this.status('starting');
    startPythonEditor(
      (message) => {
        for (const listener of this.listeners) {
          listener(message);
        }
      },
      (error) => {
        this.fail(error);
      },
    )
      .then((session) => this.connect(session))
      .catch((error: unknown) => {
        this.fail(error);
      });
  }

  private connect(session: PythonEditorSession): Promise<void> {
    this.id = session.id;
    if (this.disposed || this.failed) {
      this.stop();
      return Promise.resolve();
    }
    const client = new LSPClient({
      rootUri: session.rootUri,
      timeout: REQUEST_TIMEOUT,
      sanitizeHTML: (html): string => DOMPurify.sanitize(html),
      extensions: [
        serverCompletion(),
        serverDiagnostics(),
        hoverTooltips(),
        signatureHelp(),
        pythonDiagnostics(),
      ],
    });
    this.client = client;
    client.connect({
      send: (message): void => {
        this.send(session.id, message);
      },
      subscribe: (handler): void => {
        this.listeners.add(handler);
      },
      unsubscribe: (handler): void => {
        this.listeners.delete(handler);
      },
    });
    return client.initializing.then(() => {
      if (this.disposed || this.failed) {
        this.stop();
        return;
      }
      this.install(client.plugin(session.documentUri, 'python'));
      const statuses = { current: 'ready', cached: 'cachedSdk', missing: 'missingSdk' } as const;
      this.status(statuses[session.sdkStatus]);
    });
  }

  private send(id: number, message: string): void {
    this.sending = this.sending.then(() => {
      if (!this.disposed && !this.failed) {
        return sendPythonEditor(id, message);
      }
      return;
    });
    this.sending.catch((error: unknown) => {
      this.fail(error);
    });
  }

  private fail(error: unknown): void {
    if (this.failed || this.disposed) {
      return;
    }
    this.failed = true;
    logWarn('Python completion is unavailable', error);
    this.status('failed');
    this.install([]);
    this.stop();
  }

  private stop(): void {
    if (this.client) {
      this.client.disconnect();
    }
    if (this.id !== null) {
      stopPythonEditor(this.id).catch((error: unknown) => {
        logWarn('Could not stop Python analysis', error);
      });
      this.id = null;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.listeners.clear();
  }
}

/** Disposal also stops a process whose startup completes after the editor closes. */
export const connectPythonLanguageServer = (
  install: (extension: Extension) => void,
  status: (status: AnalysisStatus) => void,
): (() => void) => {
  const server = new PythonLanguageServer(install, status);
  server.start();
  return (): void => {
    server.dispose();
  };
};

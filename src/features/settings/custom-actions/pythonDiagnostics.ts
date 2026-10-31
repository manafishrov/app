import type { Extension } from '@codemirror/state';
import type {
  DocumentDiagnosticParams,
  DocumentDiagnosticReport,
} from 'vscode-languageserver-protocol';

import { linter, type Diagnostic } from '@codemirror/lint';
import { LSPPlugin } from '@codemirror/lsp-client';

import { logWarn } from '@/lib/log';

const severities: Record<number, Diagnostic['severity']> = {
  1: 'error',
  2: 'warning',
  3: 'info',
  4: 'hint',
};

/** CodeMirror's serverDiagnostics handles push; ty also negotiates LSP pull diagnostics. */
export const pythonDiagnostics = (): Extension =>
  linter((view) => {
    const plugin = LSPPlugin.get(view);
    if (!plugin) {
      return [];
    }
    const document = view.state.doc;
    plugin.client.sync();
    return plugin.client
      .request<DocumentDiagnosticParams, DocumentDiagnosticReport>('textDocument/diagnostic', {
        textDocument: { uri: plugin.uri },
      })
      .then((report): Diagnostic[] => {
        if (report.kind !== 'full' || view.state.doc !== document) {
          return [];
        }
        return report.items.map((item): Diagnostic => ({
          from: plugin.fromPosition(item.range.start, document),
          to: plugin.fromPosition(item.range.end, document),
          severity: severities[item.severity ?? 1] ?? 'error',
          message: typeof item.message === 'string' ? item.message : item.message.value,
          source: item.source ?? 'ty',
        }));
      })
      .catch((error: unknown): Diagnostic[] => {
        if (plugin.client.connected) {
          logWarn('Python type checking failed', error);
        }
        return [];
      });
  });

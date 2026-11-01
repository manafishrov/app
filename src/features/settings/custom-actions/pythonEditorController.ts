import { indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { basicSetup, EditorView } from 'codemirror';
import { on } from 'solid-js';

import { isMobile } from '@/lib/platform';
import { capabilityStore } from '@/stores/capabilities';

import { connectPythonLanguageServer, type AnalysisStatus } from './pythonLanguageServer';

export type PythonEditorProps = {
  onAnalysisStatus: (status: AnalysisStatus) => void;
  source: string;
  disabled: boolean;
  label: string;
  onChange: (source: string) => void;
  onSave: () => void;
};
const highlighting = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--code-keyword)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--code-string)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--code-number)' },
  { tag: tags.comment, color: 'var(--muted-foreground)', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.typeName], color: 'var(--code-function)' },
]);
const createPythonState = (props: PythonEditorProps, extensions: Extension): EditorState =>
  EditorState.create({
    doc: props.source,
    extensions: [
      basicSetup,
      python(),
      indentUnit.of('    '),
      keymap.of([
        indentWithTab,
        {
          key: 'Mod-s',
          run: () => {
            props.onSave();
            return true;
          },
        },
      ]),
      syntaxHighlighting(highlighting),
      EditorState.lineSeparator.of(props.source.includes('\r\n') ? '\r\n' : '\n'),
      EditorView.contentAttributes.of({ 'aria-label': props.label, 'aria-multiline': 'true' }),
      extensions,
    ],
  });

/*
 * The bundled language server is a separate process, which mobile apps cannot
 * start, so editing works there without completion or checking.
 */
const connectAnalysis = (
  onExtension: (extension: Extension) => void,
  onStatus: (status: AnalysisStatus) => void,
): void => {
  if (isMobile) {
    onStatus('unsupported');
    return;
  }
  createEffect(
    on(
      () => capabilityStore.connected,
      () => {
        const disconnect = connectPythonLanguageServer(onExtension, onStatus);
        onCleanup(disconnect);
      },
    ),
  );
};

export const mountPythonEditor = (parent: HTMLElement, props: PythonEditorProps): (() => void) => {
  const editable = new Compartment();
  const analysis = new Compartment();
  let analysisExtensions: Extension = [];
  let currentSource = props.source;
  const createState = (): EditorState =>
    createPythonState(props, [
      analysis.of(analysisExtensions),
      editable.of(EditorState.readOnly.of(props.disabled)),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          currentSource = update.state.sliceDoc();
          props.onChange(currentSource);
        }
      }),
    ]);
  const view = new EditorView({ parent, state: createState() });
  connectAnalysis((extension) => {
    analysisExtensions = extension;
    view.dispatch({ effects: analysis.reconfigure(extension) });
  }, props.onAnalysisStatus);
  createEffect(() => {
    if (props.source !== currentSource) {
      currentSource = props.source;
      view.setState(createState());
    }
  });
  createEffect(() => {
    view.dispatch({ effects: editable.reconfigure(EditorState.readOnly.of(props.disabled)) });
  });
  return (): void => {
    view.destroy();
  };
};

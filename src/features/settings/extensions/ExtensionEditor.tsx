import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { H3 } from '@manafishrov/ui/typography';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';

import type { AnalysisStatus } from './pythonLanguageServer';

import { extensionDraft } from './editorDraft';
import { OperationFeedback } from './OperationFeedback';
import { createOperation } from './operations';
import { PythonAnalysisStatus } from './PythonAnalysisStatus';
import { PythonEditor } from './PythonEditor';

export const ExtensionEditor: Component = () => {
  const operation = createOperation();
  const [analysis, setAnalysis] = createSignal<AnalysisStatus>('starting');
  const save = (): void => {
    operation.run(
      () => extensionDraft.validate().then(extensionDraft.install),
      m.extensions_installed_success(),
    );
  };
  return (
    <section
      data-extension-editor
      class='flex min-w-0 scroll-mt-12 flex-col gap-3'
      aria-label={m.extensions_editor()}
    >
      <H3>{m.extensions_editor()}</H3>
      <PythonEditor
        onAnalysisStatus={setAnalysis}
        source={extensionDraft.source()}
        onChange={extensionDraft.setSource}
        disabled={operation.busy()}
        label={m.extensions_source()}
      />
      <PythonAnalysisStatus status={analysis()} />
      <div class='flex items-center gap-3'>
        <Button
          disabled={
            operation.busy() || !capabilityStore.connected || extensionDraft.source().trim() === ''
          }
          onClick={save}
        >
          {operation.busy() ? m.extensions_working() : m.extensions_install()}
        </Button>
        <Show when={extensionDraft.dirty()}>
          <span class='text-xs text-muted-foreground'>{m.extensions_unsaved()}</span>
        </Show>
      </div>
      <OperationFeedback operation={operation} />
    </section>
  );
};

import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { H3 } from '@manafishrov/ui/typography';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';

import type { AnalysisStatus } from './pythonLanguageServer';

import { customActionDraft } from './editorDraft';
import { OperationFeedback } from './OperationFeedback';
import { createOperation } from './operations';
import { PythonAnalysisStatus } from './PythonAnalysisStatus';
import { PythonEditor } from './PythonEditor';

export const CustomActionEditor: Component = () => {
  const operation = createOperation();
  const [analysis, setAnalysis] = createSignal<AnalysisStatus>('starting');
  const save = (): void => {
    operation.run(
      () => customActionDraft.validate().then(customActionDraft.install),
      m.custom_action_scripts_installed_success(),
    );
  };
  return (
    <section
      data-custom-action-editor
      class='flex min-w-0 scroll-mt-12 flex-col gap-3'
      aria-label={m.custom_action_scripts_editor()}
    >
      <H3>{m.custom_action_scripts_editor()}</H3>
      <PythonEditor
        onAnalysisStatus={setAnalysis}
        source={customActionDraft.source()}
        onChange={customActionDraft.setSource}
        disabled={operation.busy()}
        label={m.custom_action_scripts_source()}
      />
      <PythonAnalysisStatus status={analysis()} />
      <div class='flex items-center gap-3'>
        <Button
          disabled={
            operation.busy() ||
            !capabilityStore.connected ||
            customActionDraft.source().trim() === ''
          }
          onClick={save}
        >
          {operation.busy() ? m.custom_action_scripts_working() : m.custom_action_scripts_install()}
        </Button>
        <Show when={customActionDraft.dirty()}>
          <span class='text-xs text-muted-foreground'>{m.custom_action_scripts_unsaved()}</span>
        </Show>
      </div>
      <OperationFeedback operation={operation} />
    </section>
  );
};

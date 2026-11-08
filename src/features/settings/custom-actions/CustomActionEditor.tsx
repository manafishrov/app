import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { Button } from '@manafishrov/ui/button';
import ArrowBackIcon from '~icons/material-symbols/arrow-back';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';

import type { AnalysisStatus } from './pythonLanguageServer';

import { customActionDraft } from './editorDraft';
import { OperationFeedback } from './OperationFeedback';
import { createOperation } from './operations';
import { PythonAnalysisStatus } from './PythonAnalysisStatus';
import { PythonEditor } from './PythonEditor';

type EditorNavigation = { onBack: () => void; onDiscard: () => void };
const EditorHeader: Component<
  EditorNavigation & { busy: boolean; canSave: boolean; onSave: () => void }
> = (props) => (
  <header class='flex flex-wrap items-center gap-3'>
    <Button
      variant='ghost'
      size='icon'
      disabled={props.busy}
      aria-label={m.custom_action_scripts_back()}
      onClick={props.onBack}
    >
      <ArrowBackIcon class='size-4' />
    </Button>
    <h1 class='min-w-0 flex-1 text-lg font-semibold break-words'>
      {customActionDraft.name() || m.custom_action_scripts_new()}
    </h1>
    <Show when={customActionDraft.dirty()}>
      <Badge variant='outline' class='text-muted-foreground'>
        {m.custom_action_scripts_unsaved()}
      </Badge>
    </Show>
    <div class='ml-auto grid grid-cols-2 gap-2'>
      <Button
        variant='outline'
        size='sm'
        class='w-22'
        disabled={props.busy || !customActionDraft.dirty()}
        onClick={props.onDiscard}
      >
        {m.custom_action_scripts_discard()}
      </Button>
      <Button size='sm' class='w-22' disabled={!props.canSave} onClick={props.onSave}>
        {m.custom_action_scripts_save()}
      </Button>
    </div>
  </header>
);

export const CustomActionEditor: Component<EditorNavigation> = (props) => {
  const operation = createOperation();
  const [analysis, setAnalysis] = createSignal<AnalysisStatus>('starting');
  const canSave = (): boolean =>
    !operation.busy() &&
    capabilityStore.connected &&
    customActionDraft.dirty() &&
    customActionDraft.source().trim() !== '';
  const save = (): void => {
    if (canSave()) {
      operation.run(() => customActionDraft.validate().then(customActionDraft.install));
    }
  };
  return (
    <section
      data-custom-action-editor
      class='custom-action-editor flex min-h-0 min-w-0 flex-col gap-3'
      aria-label={m.custom_action_scripts_editor()}
    >
      <EditorHeader
        onBack={props.onBack}
        onDiscard={props.onDiscard}
        busy={operation.busy()}
        canSave={canSave()}
        onSave={save}
      />
      <PythonEditor
        onAnalysisStatus={setAnalysis}
        source={customActionDraft.source()}
        onChange={customActionDraft.setSource}
        onSave={save}
        disabled={operation.busy()}
        label={m.custom_action_scripts_source()}
      />
      <PythonAnalysisStatus status={analysis()} />
      <OperationFeedback operation={operation} />
    </section>
  );
};

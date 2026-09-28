import type { Accessor, Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { P } from '@manafishrov/ui/typography';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';
import { importCustomActionSource } from '@/tauri/capabilities';

import { CustomActionEditor } from './CustomActionEditor';
import { customActionDraft } from './editorDraft';
import { InstalledCustomActions } from './InstalledCustomActions';
import { OperationFeedback } from './OperationFeedback';
import { createOperation } from './operations';
import { ReplaceDraftAlertDialog } from './ReplaceDraftAlertDialog';

type PendingScript = { source: string; installed: boolean };
type EditorNavigation = {
  open: Accessor<boolean>;
  pending: Accessor<PendingScript | null>;
  load: (source: string, installed: boolean) => void;
  replace: () => void;
  cancel: () => void;
};
const createEditorNavigation = (): EditorNavigation => {
  const [open, setOpen] = createSignal(customActionDraft.source() !== '');
  const [pending, setPending] = createSignal<PendingScript | null>(null);
  const apply = (source: string, installed: boolean): void => {
    customActionDraft.load(source, installed);
    setOpen(true);
    requestAnimationFrame(() => {
      const editor = document.querySelector<HTMLElement>('[data-custom-action-editor]');
      if (editor) {
        editor.scrollIntoView({ block: 'start' });
      }
    });
  };
  const load = (source: string, installed: boolean): void => {
    if (customActionDraft.dirty()) {
      setPending({ source, installed });
    } else {
      apply(source, installed);
    }
  };
  const replace = (): void => {
    const draft = pending();
    if (draft) {
      apply(draft.source, draft.installed);
    }
    setPending(null);
  };
  return { open, pending, load, replace, cancel: () => setPending(null) };
};

export const CustomActionWorkspace: Component = () => {
  const editor = createEditorNavigation();
  const operation = createOperation();
  const importSource = (): void => {
    operation.run(() =>
      importCustomActionSource().then((source) => {
        if (source !== null) {
          editor.load(source, false);
        }
      }),
    );
  };
  return (
    <>
      <div class='flex flex-wrap gap-2'>
        <Button
          variant='outline'
          disabled={operation.busy()}
          onClick={() => {
            editor.load('', false);
          }}
        >
          {m.custom_action_scripts_new()}
        </Button>
        <Button variant='outline' disabled={operation.busy()} onClick={importSource}>
          {m.custom_action_scripts_import()}
        </Button>
      </div>
      <OperationFeedback operation={operation} />
      <Show when={capabilityStore.connected} fallback={<P>{m.custom_action_scripts_offline()}</P>}>
        <InstalledCustomActions onLoad={editor.load} />
      </Show>
      <Show when={editor.open()}>
        <CustomActionEditor />
      </Show>
      <ReplaceDraftAlertDialog
        open={editor.pending() !== null}
        onConfirm={editor.replace}
        onCancel={editor.cancel}
      />
    </>
  );
};

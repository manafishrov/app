import type { Accessor, Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { P } from '@manafishrov/ui/typography';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';
import { importExtensionSource } from '@/tauri/capabilities';

import { extensionDraft } from './editorDraft';
import { ExtensionEditor } from './ExtensionEditor';
import { InstalledExtensions } from './InstalledExtensions';
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
  const [open, setOpen] = createSignal(extensionDraft.source() !== '');
  const [pending, setPending] = createSignal<PendingScript | null>(null);
  const apply = (source: string, installed: boolean): void => {
    extensionDraft.load(source, installed);
    setOpen(true);
    requestAnimationFrame(() => {
      const editor = document.querySelector<HTMLElement>('[data-extension-editor]');
      if (editor) {
        editor.scrollIntoView({ block: 'start' });
      }
    });
  };
  const load = (source: string, installed: boolean): void => {
    if (extensionDraft.dirty()) {
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

export const ExtensionWorkspace: Component = () => {
  const editor = createEditorNavigation();
  const operation = createOperation();
  const importSource = (): void => {
    operation.run(() =>
      importExtensionSource().then((source) => {
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
          {m.extensions_new()}
        </Button>
        <Button variant='outline' disabled={operation.busy()} onClick={importSource}>
          {m.extensions_import()}
        </Button>
      </div>
      <OperationFeedback operation={operation} />
      <Show when={capabilityStore.connected} fallback={<P>{m.extensions_offline()}</P>}>
        <InstalledExtensions onLoad={editor.load} />
      </Show>
      <Show when={editor.open()}>
        <ExtensionEditor />
      </Show>
      <ReplaceDraftAlertDialog
        open={editor.pending() !== null}
        onConfirm={editor.replace}
        onCancel={editor.cancel}
      />
    </>
  );
};

import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { Empty, EmptyDescription } from '@manafishrov/ui/empty';
import { H1 } from '@manafishrov/ui/typography';
import AddIcon from '~icons/material-symbols/add';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';
import { importCustomActionSource } from '@/tauri/capabilities';

import { CustomActionEditor } from './CustomActionEditor';
import { CustomActionInstructions } from './CustomActionInstructions';
import { DiscardDraftAlertDialog } from './DiscardDraftAlertDialog';
import {
  customActionDraft,
  customActionEditorOpen,
  setCustomActionEditorOpen,
} from './editorDraft';
import { InstalledCustomActions } from './InstalledCustomActions';
import { OperationFeedback } from './OperationFeedback';
import { createOperation, type Operation } from './operations';

const NEW_SCRIPT = `from manafish_sdk import Context, Script, Widget

script = Script("depth_monitor", name="Depth monitor")
depth = script.reading("depth", float, unit="m", widget=Widget.TEXT)


@script.action(name="Read depth")
async def read_depth(ctx: Context) -> None:
    if not ctx.rov.system_health.pressure_sensor_healthy:
        await depth.publish(None)
        raise RuntimeError("Pressure sensor is unavailable")
    await depth.publish(ctx.rov.pressure.depth)
`;

const load = (source: string, installed: boolean, name?: string): void => {
  customActionDraft.load(source, installed, name);
  setCustomActionEditorOpen(true);
};

const ScriptList: Component<{ operation: Operation; onImport: () => void }> = (props) => (
  <div class='flex min-w-0 flex-col gap-5'>
    <header class='flex flex-wrap items-center justify-between gap-3'>
      <H1>{m.custom_action_scripts_title()}</H1>
      <div class='flex flex-wrap items-start gap-2'>
        <CustomActionInstructions />
        <Button
          variant='outline'
          size='sm'
          disabled={props.operation.busy()}
          onClick={props.onImport}
        >
          {m.custom_action_scripts_import()}
        </Button>
        <Button
          size='sm'
          disabled={props.operation.busy()}
          onClick={() => {
            load(NEW_SCRIPT, false);
          }}
        >
          <AddIcon class='size-4' />
          {m.custom_action_scripts_new()}
        </Button>
      </div>
    </header>
    <OperationFeedback operation={props.operation} />
    <Show
      when={capabilityStore.connected}
      fallback={
        <Empty>
          <EmptyDescription>{m.custom_action_scripts_offline()}</EmptyDescription>
        </Empty>
      }
    >
      <InstalledCustomActions onLoad={load} />
    </Show>
  </div>
);

type EditorNavigation = {
  pending: () => (() => void) | null;
  back: () => void;
  discard: () => void;
  confirmDiscard: () => void;
  cancel: () => void;
};
const useEditorNavigation = (): EditorNavigation => {
  const [pending, setPending] = createSignal<(() => void) | null>(null);
  const discardThen = (next: () => void): void => {
    if (customActionDraft.dirty()) {
      setPending(() => next);
    } else {
      next();
    }
  };
  const back = (): void => {
    discardThen(() => setCustomActionEditorOpen(false));
  };
  const discard = (): void => {
    discardThen(() => {
      if (customActionDraft.source() === '') {
        setCustomActionEditorOpen(false);
      }
    });
  };
  const confirmDiscard = (): void => {
    customActionDraft.discard();
    const next = pending();
    if (next) {
      next();
    }
    setPending(null);
  };
  return {
    pending,
    back,
    discard,
    confirmDiscard,
    cancel: () => {
      setPending(null);
    },
  };
};

export const CustomActionWorkspace: Component = () => {
  const operation = createOperation();
  const editor = useEditorNavigation();
  const importSource = (): void => {
    operation.run(() =>
      importCustomActionSource().then((source) => {
        if (source !== null) {
          load(source, false);
        }
      }),
    );
  };
  return (
    <>
      <Show
        when={customActionEditorOpen()}
        fallback={<ScriptList operation={operation} onImport={importSource} />}
      >
        <CustomActionEditor onBack={editor.back} onDiscard={editor.discard} />
      </Show>
      <DiscardDraftAlertDialog
        open={editor.pending() !== null}
        onConfirm={editor.confirmDiscard}
        onCancel={editor.cancel}
      />
    </>
  );
};

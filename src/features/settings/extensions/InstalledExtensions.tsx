import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { H3, P } from '@manafishrov/ui/typography';
import DeleteIcon from '~icons/material-symbols/delete';

import type { ExtensionDescriptor } from '@/stores/capabilityTypes';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';
import { requestCapability } from '@/tauri/capabilities';

import { ActionSettings } from './ActionSettings';
import { readExtension } from './api';
import { ConfirmDeleteAlertDialog } from './ConfirmDeleteAlertDialog';
import { OperationFeedback } from './OperationFeedback';
import { createOperation, type Operation } from './operations';

type ExtensionProps = { onLoad: (source: string, installed: boolean) => void };
const runtimeLabel = (extension: ExtensionDescriptor): string => {
  if (extension.status === 'error') {
    return m.extensions_error();
  }
  if (!extension.enabled) {
    return m.extensions_disabled();
  }
  return extension.status === 'running' ? m.extensions_ready() : m.extensions_enabled();
};

const ExtensionEnableButton: Component<{ extension: ExtensionDescriptor; operation: Operation }> = (
  props,
) => (
  <Button
    variant='outline'
    size='sm'
    disabled={props.operation.busy()}
    onClick={() => {
      props.operation.run(() =>
        requestCapability('extension.enable', {
          id: props.extension.id,
          enabled: !props.extension.enabled,
        }),
      );
    }}
  >
    {props.extension.enabled ? m.extensions_disable() : m.extensions_enable()}
  </Button>
);

const ExtensionControls: Component<ExtensionProps & { extension: ExtensionDescriptor }> = (
  props,
) => {
  const operation = createOperation();
  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const remove = (): void => {
    setConfirmDelete(false);
    operation.run(() => requestCapability('extension.remove', { id: props.extension.id }));
  };
  return (
    <>
      <div class='flex flex-wrap gap-2'>
        <ExtensionEnableButton extension={props.extension} operation={operation} />
        <Button
          variant='ghost'
          size='sm'
          disabled={operation.busy()}
          onClick={() => {
            operation.run(() =>
              readExtension(props.extension.id).then((source) => {
                props.onLoad(source, true);
              }),
            );
          }}
        >
          {m.extensions_edit()}
        </Button>
        <Button
          variant='ghost'
          size='icon'
          class='ml-auto'
          disabled={operation.busy()}
          aria-label={m.extensions_delete_title({ name: props.extension.name })}
          onClick={() => setConfirmDelete(true)}
        >
          <DeleteIcon class='size-4' />
        </Button>
      </div>
      <OperationFeedback operation={operation} />
      <ConfirmDeleteAlertDialog
        name={confirmDelete() ? props.extension.name : ''}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </>
  );
};

const ExtensionActions: Component<{ extension: ExtensionDescriptor }> = (props) => {
  const actions = createMemo(() =>
    capabilityStore.catalog.actions.filter((action) => action.extensionId === props.extension.id),
  );
  return (
    <Show when={actions().length > 0}>
      <details>
        <summary class='cursor-pointer rounded text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'>
          {m.extensions_action_settings()}
        </summary>
        <For each={actions()}>
          {(action) => <ActionSettings action={action} enabled={props.extension.enabled} />}
        </For>
      </details>
    </Show>
  );
};

const ExtensionCard: Component<ExtensionProps & { extension: ExtensionDescriptor }> = (props) => (
  <article class='flex flex-col gap-2 border-b border-border py-4 last:border-0'>
    <div class='flex items-start justify-between gap-3'>
      <div class='min-w-0'>
        <p class='text-sm font-semibold break-words'>{props.extension.name}</p>
        <p class='text-xs break-words text-muted-foreground'>{props.extension.description}</p>
      </div>
      <span class='shrink-0 text-xs text-muted-foreground'>{runtimeLabel(props.extension)}</span>
    </div>
    <Show when={props.extension.error}>
      <p role='alert' class='text-sm break-words text-destructive'>
        {props.extension.error}
      </p>
    </Show>
    <ExtensionControls extension={props.extension} onLoad={props.onLoad} />
    <ExtensionActions extension={props.extension} />
  </article>
);

export const InstalledExtensions: Component<ExtensionProps> = (props) => (
  <section class='flex flex-col'>
    <H3>{m.extensions_installed()}</H3>
    <For each={capabilityStore.catalog.extensions} fallback={<P>{m.extensions_empty()}</P>}>
      {(extension) => <ExtensionCard extension={extension} onLoad={props.onLoad} />}
    </For>
  </section>
);

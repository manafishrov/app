import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { H3, P } from '@manafishrov/ui/typography';
import DeleteIcon from '~icons/material-symbols/delete';

import type { CustomActionDescriptor } from '@/stores/capabilityTypes';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';
import { requestCapability } from '@/tauri/capabilities';

import { ActionSettings } from './ActionSettings';
import { readCustomAction } from './api';
import { ConfirmDeleteAlertDialog } from './ConfirmDeleteAlertDialog';
import { OperationFeedback } from './OperationFeedback';
import { createOperation, type Operation } from './operations';

type CustomActionProps = { onLoad: (source: string, installed: boolean) => void };
const runtimeLabel = (customAction: CustomActionDescriptor): string => {
  if (customAction.status === 'error') {
    return m.custom_action_scripts_error();
  }
  if (!customAction.enabled) {
    return m.custom_action_scripts_disabled();
  }
  return customAction.status === 'running'
    ? m.custom_action_scripts_ready()
    : m.custom_action_scripts_enabled();
};

const CustomActionEnableButton: Component<{
  customAction: CustomActionDescriptor;
  operation: Operation;
}> = (props) => (
  <Button
    variant='outline'
    size='sm'
    disabled={props.operation.busy()}
    onClick={() => {
      props.operation.run(() =>
        requestCapability('customAction.enable', {
          id: props.customAction.id,
          enabled: !props.customAction.enabled,
        }),
      );
    }}
  >
    {props.customAction.enabled
      ? m.custom_action_scripts_disable()
      : m.custom_action_scripts_enable()}
  </Button>
);

const CustomActionControls: Component<
  CustomActionProps & { customAction: CustomActionDescriptor }
> = (props) => {
  const operation = createOperation();
  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const remove = (): void => {
    setConfirmDelete(false);
    operation.run(() => requestCapability('customAction.remove', { id: props.customAction.id }));
  };
  return (
    <>
      <div class='flex flex-wrap gap-2'>
        <CustomActionEnableButton customAction={props.customAction} operation={operation} />
        <Button
          variant='ghost'
          size='sm'
          disabled={operation.busy()}
          onClick={() => {
            operation.run(() =>
              readCustomAction(props.customAction.id).then((source) => {
                props.onLoad(source, true);
              }),
            );
          }}
        >
          {m.custom_action_scripts_edit()}
        </Button>
        <Button
          variant='ghost'
          size='icon'
          class='ml-auto'
          disabled={operation.busy()}
          aria-label={m.custom_action_scripts_delete_title({ name: props.customAction.name })}
          onClick={() => setConfirmDelete(true)}
        >
          <DeleteIcon class='size-4' />
        </Button>
      </div>
      <OperationFeedback operation={operation} />
      <ConfirmDeleteAlertDialog
        name={confirmDelete() ? props.customAction.name : ''}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </>
  );
};

const CustomActionActions: Component<{ customAction: CustomActionDescriptor }> = (props) => {
  const actions = createMemo(() =>
    capabilityStore.catalog.actions.filter(
      (action) => action.customActionId === props.customAction.id,
    ),
  );
  return (
    <Show when={actions().length > 0}>
      <details>
        <summary class='cursor-pointer rounded text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'>
          {m.custom_action_scripts_action_settings()}
        </summary>
        <For each={actions()}>
          {(action) => <ActionSettings action={action} enabled={props.customAction.enabled} />}
        </For>
      </details>
    </Show>
  );
};

const CustomActionCard: Component<CustomActionProps & { customAction: CustomActionDescriptor }> = (
  props,
) => (
  <article class='flex flex-col gap-2 border-b border-border py-4 last:border-0'>
    <div class='flex items-start justify-between gap-3'>
      <div class='min-w-0'>
        <p class='text-sm font-semibold break-words'>{props.customAction.name}</p>
        <p class='text-xs break-words text-muted-foreground'>{props.customAction.description}</p>
      </div>
      <span class='shrink-0 text-xs text-muted-foreground'>{runtimeLabel(props.customAction)}</span>
    </div>
    <Show when={props.customAction.error}>
      <p role='alert' class='text-sm break-words text-destructive'>
        {props.customAction.error}
      </p>
    </Show>
    <CustomActionControls customAction={props.customAction} onLoad={props.onLoad} />
    <CustomActionActions customAction={props.customAction} />
  </article>
);

export const InstalledCustomActions: Component<CustomActionProps> = (props) => (
  <section class='flex flex-col'>
    <H3>{m.custom_action_scripts_installed()}</H3>
    <For
      each={capabilityStore.catalog.customActions}
      fallback={<P>{m.custom_action_scripts_empty()}</P>}
    >
      {(customAction) => <CustomActionCard customAction={customAction} onLoad={props.onLoad} />}
    </For>
  </section>
);

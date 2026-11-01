import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { Button } from '@manafishrov/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@manafishrov/ui/card';
import { Empty, EmptyDescription } from '@manafishrov/ui/empty';
import { Switch, SwitchControl, SwitchThumb } from '@manafishrov/ui/switch';
import { H3 } from '@manafishrov/ui/typography';
import DeleteIcon from '~icons/material-symbols/delete';
import EditIcon from '~icons/material-symbols/edit';

import type { CustomActionDescriptor } from '@/stores/capabilityTypes';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';
import { requestCapability } from '@/tauri/capabilities';

import { ActionSettings } from './ActionSettings';
import { readCustomAction } from './api';
import { ConfirmDeleteAlertDialog } from './ConfirmDeleteAlertDialog';
import { OperationFeedback } from './OperationFeedback';
import { createOperation, type Operation } from './operations';

type CustomActionProps = { onLoad: (source: string, installed: boolean, name?: string) => void };
const runtimeLabel = (customAction: CustomActionDescriptor): string => {
  if (customAction.status === 'error') {
    return m.custom_action_scripts_error();
  }
  if (!customAction.enabled) {
    return m.custom_action_scripts_disabled();
  }
  return customAction.status === 'running'
    ? m.custom_action_scripts_running()
    : m.custom_action_scripts_enabled();
};

const ScriptState: Component<{ customAction: CustomActionDescriptor; operation: Operation }> = (
  props,
) => (
  <div class='flex shrink-0 items-center gap-3'>
    <Badge
      variant={props.customAction.status === 'error' ? 'destructive' : 'outline'}
      class={props.customAction.status === 'running' ? 'text-primary' : ''}
    >
      {runtimeLabel(props.customAction)}
    </Badge>
    <Switch
      size='sm'
      checked={props.customAction.enabled}
      disabled={props.operation.busy()}
      aria-label={m.custom_action_scripts_enable_name({ name: props.customAction.name })}
      onCheckedChange={(details) => {
        props.operation.run(() =>
          requestCapability('customAction.enable', {
            id: props.customAction.id,
            enabled: details.checked,
          }),
        );
      }}
    >
      <SwitchControl>
        <SwitchThumb />
      </SwitchControl>
    </Switch>
  </div>
);

const ScriptHeader: Component<{ customAction: CustomActionDescriptor; operation: Operation }> = (
  props,
) => (
  <CardHeader class='gap-3'>
    <div class='flex flex-wrap items-start justify-between gap-3'>
      <div class='min-w-0 flex-1 basis-48'>
        <CardTitle class='text-sm'>{props.customAction.name}</CardTitle>
        <CardDescription class='mt-1 text-xs'>{props.customAction.description}</CardDescription>
      </div>
      <ScriptState customAction={props.customAction} operation={props.operation} />
    </div>
  </CardHeader>
);

const ScriptControls: Component<
  CustomActionProps & {
    customAction: CustomActionDescriptor;
    operation: Operation;
    onDelete: () => void;
  }
> = (props) => (
  <div class='flex items-center gap-1'>
    <Button
      variant='outline'
      size='sm'
      disabled={props.operation.busy()}
      onClick={() => {
        props.operation.run(() =>
          readCustomAction(props.customAction.id).then((source) => {
            props.onLoad(source, true, props.customAction.name);
          }),
        );
      }}
    >
      <EditIcon class='size-4' />
      {m.custom_action_scripts_edit()}
    </Button>
    <Button
      variant='ghost'
      size='icon'
      class='size-8'
      disabled={props.operation.busy()}
      title={m.custom_action_scripts_delete_title({ name: props.customAction.name })}
      aria-label={m.custom_action_scripts_delete_title({ name: props.customAction.name })}
      onClick={() => {
        props.onDelete();
      }}
    >
      <DeleteIcon class='size-4' />
    </Button>
  </div>
);

const CustomActionCard: Component<CustomActionProps & { customAction: CustomActionDescriptor }> = (
  props,
) => {
  const operation = createOperation();
  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const actions = createMemo(() =>
    capabilityStore.catalog.actions.filter(
      (action) => action.customActionId === props.customAction.id,
    ),
  );
  const remove = (): void => {
    setConfirmDelete(false);
    operation.run(() => requestCapability('customAction.remove', { id: props.customAction.id }));
  };
  return (
    <Card size='sm'>
      <ScriptHeader customAction={props.customAction} operation={operation} />
      <CardContent class='flex flex-col gap-3'>
        <Show when={props.customAction.error}>
          <p
            role='alert'
            class='rounded-r border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-xs break-words text-destructive'
          >
            {props.customAction.error}
          </p>
        </Show>
        <ScriptControls
          customAction={props.customAction}
          operation={operation}
          onLoad={props.onLoad}
          onDelete={() => setConfirmDelete(true)}
        />
        <OperationFeedback operation={operation} />
        <For each={actions()}>
          {(action) => <ActionSettings action={action} enabled={props.customAction.enabled} />}
        </For>
      </CardContent>
      <ConfirmDeleteAlertDialog
        name={confirmDelete() ? props.customAction.name : ''}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </Card>
  );
};

export const InstalledCustomActions: Component<CustomActionProps> = (props) => (
  <section class='flex flex-col gap-3'>
    <H3>{m.custom_action_scripts_installed()}</H3>
    <For
      each={capabilityStore.catalog.customActions}
      fallback={
        <Empty>
          <EmptyDescription>{m.custom_action_scripts_empty()}</EmptyDescription>
        </Empty>
      }
    >
      {(customAction) => <CustomActionCard customAction={customAction} onLoad={props.onLoad} />}
    </For>
  </section>
);

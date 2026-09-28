import type { Component } from 'solid-js';

import type { Operation } from './operations';

export const OperationFeedback: Component<{ operation: Operation }> = (props) => (
  <Show when={props.operation.error() !== '' || props.operation.message() !== ''}>
    <div class='text-sm' aria-live='polite'>
      <Show when={props.operation.error()}>
        <p role='alert' class='break-words text-destructive'>
          {props.operation.error()}
        </p>
      </Show>
      <Show when={props.operation.message()}>
        <p class='text-muted-foreground'>{props.operation.message()}</p>
      </Show>
    </div>
  </Show>
);

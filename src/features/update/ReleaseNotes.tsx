import { Show, type Component } from 'solid-js';

import * as m from '@/paraglide/messages';

export const ReleaseNotes: Component<{
  notes: string | undefined;
  class?: string | undefined;
}> = (props) => (
  <div class={`flex flex-col gap-1.5 ${props.class ?? ''}`}>
    <span class='text-xs font-medium text-muted-foreground'>{m.release_notes_title()}</span>
    <Show
      when={props.notes}
      fallback={<p class='text-sm text-muted-foreground italic'>{m.release_notes_unavailable()}</p>}
    >
      {(notes) => (
        <div class='max-h-48 overflow-y-auto'>
          <p class='text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-foreground/90'>
            {notes()}
          </p>
        </div>
      )}
    </Show>
  </div>
);

import type { Component, JSXElement, Accessor } from 'solid-js';

import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@manafishrov/ui/scroll-area';
import { Spinner } from '@manafishrov/ui/spinner';

import type { LogRecord } from '@/lib/log';

import * as m from '@/paraglide/messages';

import type { ViewerSignals, VirtualizerType } from './logViewerPrimitives';

import { VirtualLogRow } from './VirtualLogRow';

type LogViewerContentProps = {
  signals: ViewerSignals;
  actions: {
    setViewportRefWhenReady: (element: HTMLDivElement) => void;
    handleViewportScroll: () => void;
  };
  filteredLogs: Accessor<LogRecord[]>;
  virtualizer: VirtualizerType;
  measureRow: (element: HTMLDivElement) => void;
};

const EmptyState: Component<LogViewerContentProps> = (props) => (
  <>
    <Show when={props.signals.isLoading()}>
      <div class='flex h-32 items-center justify-center'>
        <Spinner class='size-6' />
      </div>
    </Show>
    <Show when={!props.signals.isLoading() && props.filteredLogs().length === 0}>
      <div class='flex h-20 items-center justify-center text-muted-foreground'>
        {props.signals.logs().length === 0
          ? m.debug_no_logs_recorded_yet()
          : m.debug_no_logs_match_filters()}
      </div>
    </Show>
  </>
);

const LogList: Component<LogViewerContentProps> = (props) => (
  <div
    style={{
      height: `${props.virtualizer.getTotalSize()}px`,
      position: 'relative',
      width: '100%',
    }}
  >
    <For each={props.virtualizer.getVirtualItems()}>
      {(virtualItem): JSXElement | undefined => {
        const log = props.filteredLogs()[virtualItem.index];
        if (!log) {
          return;
        }

        return (
          <VirtualLogRow
            index={virtualItem.index}
            start={virtualItem.start}
            log={log}
            measureRow={props.measureRow}
          />
        );
      }}
    </For>
  </div>
);

const LogViewerContent: Component<LogViewerContentProps> = (props) => (
  <ScrollArea class='min-h-0 w-full flex-1 rounded-md border bg-background/50'>
    <ScrollAreaViewport
      ref={props.actions.setViewportRefWhenReady}
      onScroll={props.actions.handleViewportScroll}
      class='h-full w-full'
    >
      <ScrollAreaContent>
        <EmptyState {...props} />
        <LogList {...props} />
      </ScrollAreaContent>
    </ScrollAreaViewport>
    <ScrollAreaScrollbar orientation='vertical'>
      <ScrollAreaThumb />
    </ScrollAreaScrollbar>
  </ScrollArea>
);

export { LogViewerContent };

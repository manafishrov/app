import { cn } from '@manafishrov/ui';
import { type Component, createEffect, onCleanup, onMount } from 'solid-js';

import { logError } from '@/lib/log';

import { LogViewerContent } from './Content';
import { LogViewerHeader } from './Header';
import {
  createFilteredLogs,
  createViewerActions,
  createViewerSignals,
  createVirtualizerTools,
} from './logViewerPrimitives';

type LogViewerProps = {
  class?: string;
};

const LogViewer: Component<LogViewerProps> = (props) => {
  const signals = createViewerSignals();
  const filteredLogs = createFilteredLogs(signals);

  const { virtualizer, measureRow, remeasureAndFollowTail } = createVirtualizerTools({
    viewportRef: signals.viewportRef,
    filteredLogs,
    followTail: signals.followTail,
    setFollowTail: signals.setFollowTail,
  });

  const actions = createViewerActions(signals, remeasureAndFollowTail);

  createEffect((): void => {
    queueMicrotask((): void => {
      virtualizer.measure();
    });
  });

  onMount((): void => {
    actions.loadLogs().catch((error: unknown): void => {
      logError('Failed to load logs', error);
    });
    globalThis.addEventListener('log:added', actions.handleLogAdded);
  });

  onCleanup((): void => {
    globalThis.removeEventListener('log:added', actions.handleLogAdded);
  });

  return (
    <div class={cn('flex h-full flex-col', props.class)}>
      <LogViewerHeader signals={signals} actions={actions} />
      <LogViewerContent
        signals={signals}
        actions={actions}
        filteredLogs={filteredLogs}
        virtualizer={virtualizer}
        measureRow={measureRow}
      />
    </div>
  );
};

export { LogViewer };

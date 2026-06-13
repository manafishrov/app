import type { Component } from 'solid-js';

import { cn } from '@manafishrov/ui';

import { logError } from '@/lib/log';

import { LogViewerContent } from './Content';
import { LogViewerHeader } from './Header';
import { createViewerActions, type ViewerActions } from './logViewerActions';
import {
  createFilteredLogs,
  createViewerSignals,
  createVirtualizerTools,
  type ViewerSignals,
  type VirtualizerType,
} from './logViewerPrimitives';
import { resetMeasurementCache } from './logViewerUtils';

type LogViewerProps = {
  class?: string;
};

// Re-measure whenever the viewport width changes so pretext recomputes wrapped row heights for the new content width.
const useMeasureOnWidthChange = (signals: ViewerSignals, virtualizer: VirtualizerType): void => {
  createEffect((): void => {
    signals.viewportWidth();
    queueMicrotask((): void => {
      virtualizer.measure();
    });
  });
};

// Track the viewport's content width via ResizeObserver, re-attaching whenever the underlying element changes.
const useTrackViewportWidth = (signals: ViewerSignals): void => {
  createEffect((): void => {
    const element = signals.viewportRef();
    if (!element) {
      return;
    }
    signals.setViewportWidth(element.clientWidth);
    const observer = new ResizeObserver((): void => {
      signals.setViewportWidth(element.clientWidth);
    });
    observer.observe(element);
    onCleanup((): void => {
      observer.disconnect();
    });
  });
};

// Canvas measurement done with fallback fonts is wrong; once the real fonts load, drop the cache and re-measure with correct metrics.
const remeasureAfterFontsLoad = (virtualizer: VirtualizerType): void => {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return;
  }
  document.fonts.ready
    .then((): void => {
      resetMeasurementCache();
      virtualizer.measure();
    })
    .catch((error: unknown): void => {
      logError('Failed waiting for fonts', error);
    });
};

const useLogViewerLifecycle = (actions: ViewerActions, virtualizer: VirtualizerType): void => {
  onMount((): void => {
    actions.loadLogs().catch((error: unknown): void => {
      logError('Failed to load logs', error);
    });
    globalThis.addEventListener('log:added', actions.handleLogAdded);
    remeasureAfterFontsLoad(virtualizer);
  });

  onCleanup((): void => {
    globalThis.removeEventListener('log:added', actions.handleLogAdded);
  });
};

const LogViewer: Component<LogViewerProps> = (props) => {
  const signals = createViewerSignals();
  const filteredLogs = createFilteredLogs(signals);

  const { virtualizer, remeasureAndFollowTail } = createVirtualizerTools({
    viewportRef: signals.viewportRef,
    viewportWidth: signals.viewportWidth,
    filteredLogs,
    followTail: signals.followTail,
    setFollowTail: signals.setFollowTail,
  });

  const actions = createViewerActions(signals, remeasureAndFollowTail);

  useMeasureOnWidthChange(signals, virtualizer);
  useTrackViewportWidth(signals);
  useLogViewerLifecycle(actions, virtualizer);

  return (
    <div class={cn('flex h-full flex-col', props.class)}>
      <LogViewerHeader signals={signals} actions={actions} />
      <LogViewerContent
        signals={signals}
        actions={actions}
        filteredLogs={filteredLogs}
        virtualizer={virtualizer}
      />
    </div>
  );
};

export { LogViewer };

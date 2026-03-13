import { cn } from '@manafishrov/ui';
import { type Component, createEffect, onCleanup, onMount } from 'solid-js';

import type { LogRecord } from '@/lib/log';

import { formatTimestamp } from './logViewer.utils';

export type VirtualLogRowProps = {
  index: number;
  start: number;
  log: LogRecord;
  measureRow: (el: HTMLDivElement) => void;
};

const useRemeasure = (
  getRowRef: () => HTMLDivElement | undefined,
  measureRow: (el: HTMLDivElement) => void,
): void => {
  const remeasure = (): void => {
    const el = getRowRef();
    if (!el) {
      return;
    }
    measureRow(el);
  };

  onMount(() => {
    const el = getRowRef();
    if (!el) {
      return;
    }

    remeasure();

    const observer = new ResizeObserver(() => {
      remeasure();
    });
    observer.observe(el);

    onCleanup(() => {
      observer.disconnect();
    });
  });

  createEffect(() => {
    queueMicrotask(() => {
      remeasure();
    });
  });
};

export const VirtualLogRow: Component<VirtualLogRowProps> = (props) => {
  const refs: { row?: HTMLDivElement } = {};

  useRemeasure(() => refs.row, props.measureRow);

  return (
    <div
      data-index={props.index}
      ref={(el): void => {
        refs.row = el;
        props.measureRow(el);
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translateY(${props.start}px)`,
        width: '100%',
      }}
      class='select-text px-4 py-1.5 hover:bg-muted/30 whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-mono text-[13px] leading-relaxed text-foreground/90'
    >
      <span class='text-[11px] text-muted-foreground/70'>
        [{formatTimestamp(props.log.timestamp)}]
      </span>{' '}
      <span
        class={cn(
          'inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider align-baseline',
          props.log.level === 'error' && 'bg-red-500/15 text-red-400',
          props.log.level === 'warn' && 'bg-yellow-500/15 text-yellow-500',
          props.log.level === 'info' && 'bg-blue-500/15 text-blue-400',
        )}
      >
        {props.log.level.toUpperCase()}
      </span>{' '}
      <span class='inline-block rounded bg-muted/50 px-1.5 py-0.5 text-[10px] tracking-wider text-muted-foreground align-baseline'>
        {props.log.origin.toUpperCase()}
      </span>{' '}
      <span>{props.log.message}</span>
    </div>
  );
};

import type { Component } from 'solid-js';

import { cn } from '@manafishrov/ui';

import type { LogRecord } from '@/lib/log';

import { formatTimestamp } from './logViewerUtils';

export type VirtualLogRowProps = {
  index: number;
  start: number;
  size: number;
  log: LogRecord;
};

export const VirtualLogRow: Component<VirtualLogRowProps> = (props) => (
  <div
    data-index={props.index}
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      height: `${props.size}px`,
      transform: `translateY(${props.start}px)`,
      width: '100%',
    }}
    class='px-4 py-1.5 font-mono text-[13px] leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-foreground/90 select-text hover:bg-muted/30'
  >
    <span class='text-[11px] text-muted-foreground/70'>{formatTimestamp(props.log.timestamp)}</span>{' '}
    <span
      class={cn(
        'inline-block rounded px-1.5 py-0.5 align-baseline text-[10px] font-semibold tracking-wider',
        props.log.level === 'error' && 'bg-red-500/15 text-red-400',
        props.log.level === 'warn' && 'bg-yellow-500/15 text-yellow-500',
        props.log.level === 'info' && 'bg-blue-500/15 text-blue-400',
      )}
    >
      {props.log.level.toUpperCase()}
    </span>{' '}
    <span class='inline-block rounded bg-muted/50 px-1.5 py-0.5 align-baseline text-[10px] tracking-wider text-muted-foreground'>
      {props.log.origin.toUpperCase()}
    </span>{' '}
    <span>{props.log.message}</span>
  </div>
);

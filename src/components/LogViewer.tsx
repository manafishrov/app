import { cn } from '@manafishrov/ui';
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@manafishrov/ui/scroll-area';
import { createVirtualizer } from '@tanstack/solid-virtual';
import { type Component, For, createSignal, onMount, onCleanup } from 'solid-js';

import { getAllLogRecords, type LogRecord } from '@/lib/log';

type LogViewerProps = {
  class?: string;
};

const getLevelStyles = (level: LogRecord['level']): string => {
  switch (level) {
    case 'error': {
      return 'bg-red-500/15 text-red-400';
    }
    case 'warn': {
      return 'bg-yellow-500/15 text-yellow-500';
    }
    case 'info':
    default: {
      return 'bg-blue-500/15 text-blue-400';
    }
  }
};

const formatTimestamp = (date: Date): string => {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
};

const LogViewer: Component<LogViewerProps> = (props) => {
  const [scrollRef, setScrollRef] = createSignal<HTMLDivElement | null>(null);

  const [logs, setLogs] = createSignal<LogRecord[]>([]);

  const virtualizer = createVirtualizer({
    get count() {
      return logs().length;
    },
    getScrollElement: () => scrollRef(),
    estimateSize: () => 50,
    overscan: 10,
  });

  const loadLogs = async () => {
    const records = await getAllLogRecords();
    setLogs(records);
    const items = logs();
    if (items.length > 0) {
      virtualizer.scrollToIndex(items.length - 1, { align: 'end' });
    }
  };

  const handleLogAdded = (event: Event) => {
    const customEvent = event as CustomEvent<LogRecord>;
    setLogs((prev) => [...prev, customEvent.detail]);
  };

  onMount(() => {
    void loadLogs();
    window.addEventListener('log:added', handleLogAdded);
  });

  onCleanup(() => {
    window.removeEventListener('log:added', handleLogAdded);
  });

  return (
    <ScrollArea class={cn('size-full rounded-md border bg-background/50', props.class)}>
      <ScrollAreaViewport ref={(el) => setScrollRef(el)} class='h-full w-full'>
        <ScrollAreaContent>
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            <For each={virtualizer.getVirtualItems()}>
              {(virtualItem) => {
                const log = logs()[virtualItem.index];
                if (!log) {
                  return null;
                }

                return (
                  <div
                    data-index={virtualItem.index}
                    ref={(el) => virtualizer.measureElement(el)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      transform: `translateY(${virtualItem.start}px)`,
                      width: '100%',
                    }}
                    class='select-text px-4 py-1.5 hover:bg-muted/30 whitespace-pre-wrap break-all font-mono text-[13px] leading-relaxed text-foreground/90'
                  >
                    <span class='text-[11px] text-muted-foreground/70'>
                      [{formatTimestamp(log.timestamp)}]
                    </span>{' '}
                    <span
                      class={cn(
                        'inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider align-baseline',
                        getLevelStyles(log.level),
                      )}
                    >
                      {log.level.toUpperCase()}
                    </span>{' '}
                    <span class='inline-block rounded bg-muted/50 px-1.5 py-0.5 text-[10px] tracking-wider text-muted-foreground align-baseline'>
                      {log.origin.toUpperCase()}
                    </span>{' '}
                    <span>{log.message}</span>
                  </div>
                );
              }}
            </For>
          </div>
        </ScrollAreaContent>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation='vertical'>
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
    </ScrollArea>
  );
};

export { LogViewer };

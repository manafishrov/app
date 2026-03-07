import { cn } from '@manafishrov/ui';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@manafishrov/ui/input-group';
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@manafishrov/ui/scroll-area';
import { Toggle } from '@manafishrov/ui/toggle';
import { createVirtualizer } from '@tanstack/solid-virtual';
import {
  type Component,
  Show,
  For,
  createEffect,
  createMemo,
  createSignal,
  onMount,
  onCleanup,
} from 'solid-js';
import SearchIcon from '~icons/material-symbols/search';

import { getAllLogRecords, type LogRecord, type LogOrigin, type LogLevel } from '@/lib/log';

type LogViewerProps = {
  class?: string;
};

type VirtualLogRowProps = {
  index: number;
  start: number;
  log: LogRecord;
  measureRow: (el: HTMLDivElement) => void;
};

const formatTimestamp = (date: Date): string => {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
};

const VirtualLogRow: Component<VirtualLogRowProps> = (props) => {
  let rowRef: HTMLDivElement | undefined;

  const remeasure = () => {
    const el = rowRef;
    if (!el) {
      return;
    }
    props.measureRow(el);
  };

  onMount(() => {
    const el = rowRef;
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
    props.start;
    props.log.message;
    queueMicrotask(remeasure);
  });

  return (
    <div
      data-index={props.index}
      ref={(el) => {
        rowRef = el;
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

const LogViewer: Component<LogViewerProps> = (props) => {
  const [viewportRef, setViewportRef] = createSignal<HTMLDivElement | null>(null);

  const setViewportRefWhenReady = (el: HTMLDivElement) => {
    queueMicrotask(() => {
      if (el.isConnected) {
        setViewportRef(el);
      }
    });
  };

  const [logs, setLogs] = createSignal<LogRecord[]>([]);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [followTail, setFollowTail] = createSignal(true);

  const [sourceFilters, setSourceFilters] = createSignal<Record<LogOrigin, boolean>>({
    frontend: true,
    backend: true,
    firmware: true,
  });

  const [levelFilters, setLevelFilters] = createSignal<Record<LogLevel, boolean>>({
    info: true,
    warn: true,
    error: true,
  });

  const filteredLogs = createMemo(() => {
    const allLogs = logs();
    const query = searchQuery().toLowerCase().trim();
    const sources = sourceFilters();
    const levels = levelFilters();

    return allLogs.filter((log) => {
      if (!sources[log.origin]) return false;
      if (!levels[log.level]) return false;

      if (query) {
        const matchesMessage = log.message.toLowerCase().includes(query);
        const matchesLevel = log.level.toLowerCase().includes(query);
        const matchesOrigin = log.origin.toLowerCase().includes(query);
        if (!matchesMessage && !matchesLevel && !matchesOrigin) return false;
      }

      return true;
    });
  });

  const virtualizer = createVirtualizer({
    get count() {
      return filteredLogs().length;
    },
    get enabled() {
      return viewportRef() !== null;
    },
    getScrollElement: () => viewportRef(),
    estimateSize: () => 32,
    getItemKey: (index) => {
      const item = filteredLogs()[index];
      if (!item) return index;
      return `${item.timestamp.toISOString()}-${item.origin}-${item.level}-${index}`;
    },
  });

  const isNearBottom = (el: HTMLDivElement) => {
    const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    return distanceToBottom < 32;
  };

  const measureRow = (el: HTMLDivElement) => {
    virtualizer.measureElement(el);
    queueMicrotask(() => virtualizer.measureElement(el));
    requestAnimationFrame(() => virtualizer.measureElement(el));
  };

  const remeasureAndFollowTail = () => {
    queueMicrotask(() => {
      virtualizer.measure();
      if (followTail()) {
        scrollToBottom();
      }

      requestAnimationFrame(() => {
        virtualizer.measure();
        if (followTail()) {
          scrollToBottom();
        }
      });
    });
  };

  const scrollToBottom = () => {
    const items = filteredLogs();
    if (items.length === 0) {
      return;
    }
    virtualizer.scrollToIndex(items.length - 1, { align: 'end' });
    setFollowTail(true);
  };

  const loadLogs = async () => {
    const records = await getAllLogRecords();
    setLogs(records);
    remeasureAndFollowTail();
  };

  const handleLogAdded = (event: Event) => {
    const customEvent = event as CustomEvent<LogRecord>;
    setLogs((prev) => [...prev, customEvent.detail]);
    remeasureAndFollowTail();
  };

  const handleViewportScroll = () => {
    const viewport = viewportRef();
    if (!viewport) {
      return;
    }
    setFollowTail(isNearBottom(viewport));
  };

  const toggleSourceFilter = (source: LogOrigin) => {
    setSourceFilters((prev) => ({ ...prev, [source]: !prev[source] }));
    remeasureAndFollowTail();
  };

  const toggleLevelFilter = (level: LogLevel) => {
    setLevelFilters((prev) => ({ ...prev, [level]: !prev[level] }));
    remeasureAndFollowTail();
  };

  createEffect(() => {
    viewportRef();
    filteredLogs().length;
    queueMicrotask(() => virtualizer.measure());
  });

  onMount(() => {
    void loadLogs();
    window.addEventListener('log:added', handleLogAdded);
  });

  onCleanup(() => {
    window.removeEventListener('log:added', handleLogAdded);
  });

  return (
    <div class={cn('flex h-full flex-col', props.class)}>
      <div class='flex shrink-0 flex-col gap-2 p-2'>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden='true' />
          </InputGroupAddon>
          <InputGroupInput
            type='text'
            placeholder='Search logs...'
            value={searchQuery()}
            onInput={(e) => {
              setSearchQuery(e.currentTarget.value);
              remeasureAndFollowTail();
            }}
          />
        </InputGroup>

        <div class='flex flex-wrap items-center gap-3'>
          <div class='flex items-center gap-1'>
            <span class='mr-1 text-xs text-muted-foreground'>Source:</span>
            <Toggle
              size='sm'
              variant='outline'
              pressed={sourceFilters().frontend}
              onPressedChange={() => toggleSourceFilter('frontend')}
            >
              Frontend
            </Toggle>
            <Toggle
              size='sm'
              variant='outline'
              pressed={sourceFilters().backend}
              onPressedChange={() => toggleSourceFilter('backend')}
            >
              Backend
            </Toggle>
            <Toggle
              size='sm'
              variant='outline'
              pressed={sourceFilters().firmware}
              onPressedChange={() => toggleSourceFilter('firmware')}
            >
              Firmware
            </Toggle>
          </div>

          <div class='flex items-center gap-1'>
            <span class='mr-1 text-xs text-muted-foreground'>Level:</span>
            <Toggle
              size='sm'
              variant='outline'
              pressed={levelFilters().info}
              onPressedChange={() => toggleLevelFilter('info')}
              class='data-pressed:bg-blue-500/15 data-pressed:text-blue-400'
            >
              Info
            </Toggle>
            <Toggle
              size='sm'
              variant='outline'
              pressed={levelFilters().warn}
              onPressedChange={() => toggleLevelFilter('warn')}
              class='data-pressed:bg-yellow-500/15 data-pressed:text-yellow-500'
            >
              Warn
            </Toggle>
            <Toggle
              size='sm'
              variant='outline'
              pressed={levelFilters().error}
              onPressedChange={() => toggleLevelFilter('error')}
              class='data-pressed:bg-red-500/15 data-pressed:text-red-400'
            >
              Error
            </Toggle>
          </div>
        </div>
      </div>

      <ScrollArea class='w-full min-h-0 flex-1 rounded-md border bg-background/50'>
        <ScrollAreaViewport
          ref={setViewportRefWhenReady}
          onScroll={handleViewportScroll}
          class='h-full w-full'
        >
          <ScrollAreaContent>
            <Show when={filteredLogs().length === 0}>
              <div class='flex h-20 items-center justify-center text-muted-foreground'>
                {logs().length === 0 ? 'No logs recorded yet' : 'No logs match your filters'}
              </div>
            </Show>
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: 'relative',
                width: '100%',
              }}
            >
              <For each={virtualizer.getVirtualItems()}>
                {(virtualItem) => {
                  const log = filteredLogs()[virtualItem.index];
                  if (!log) {
                    return null;
                  }

                  return (
                    <VirtualLogRow
                      index={virtualItem.index}
                      start={virtualItem.start}
                      log={log}
                      measureRow={measureRow}
                    />
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
    </div>
  );
};

export { LogViewer };

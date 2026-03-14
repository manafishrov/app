import type { Component } from 'solid-js';

import { InputGroup, InputGroupAddon, InputGroupInput } from '@manafishrov/ui/input-group';
import { Toggle } from '@manafishrov/ui/toggle';
import SearchIcon from '~icons/material-symbols/search';

import type { LogLevel } from '@/lib/log';
import { LogOrigin } from '@/lib/log';
import * as m from '@/paraglide/messages';

import type { ViewerSignals } from './logViewerPrimitives';

type LogViewerHeaderProps = {
  signals: ViewerSignals;
  actions: {
    toggleSourceFilter: (source: LogOrigin) => void;
    toggleLevelFilter: (level: LogLevel) => void;
  };
};

const SourceFilters: Component<LogViewerHeaderProps> = (props) => (
  <div class='flex items-center gap-1'>
    <span class='mr-1 text-xs text-muted-foreground'>{m.debug_source()}:</span>
    <Toggle
      size='sm'
      variant='outline'
      pressed={props.signals.sourceFilters().frontend}
      onPressedChange={(): void => {
        props.actions.toggleSourceFilter(LogOrigin.frontend);
      }}
    >
      {m.debug_source_frontend()}
    </Toggle>
    <Toggle
      size='sm'
      variant='outline'
      pressed={props.signals.sourceFilters().backend}
      onPressedChange={(): void => {
        props.actions.toggleSourceFilter(LogOrigin.backend);
      }}
    >
      {m.debug_source_backend()}
    </Toggle>
    <Toggle
      size='sm'
      variant='outline'
      pressed={props.signals.sourceFilters().firmware}
      onPressedChange={(): void => {
        props.actions.toggleSourceFilter(LogOrigin.firmware);
      }}
    >
      {m.debug_source_firmware()}
    </Toggle>
  </div>
);

const LevelFilters: Component<LogViewerHeaderProps> = (props) => (
  <div class='flex items-center gap-1'>
    <span class='mr-1 text-xs text-muted-foreground'>{m.debug_level()}:</span>
    <Toggle
      size='sm'
      variant='outline'
      pressed={props.signals.levelFilters().info}
      onPressedChange={(): void => {
        props.actions.toggleLevelFilter('info');
      }}
      class='data-pressed:bg-blue-500/15 data-pressed:text-blue-400'
    >
      {m.debug_level_info()}
    </Toggle>
    <Toggle
      size='sm'
      variant='outline'
      pressed={props.signals.levelFilters().warn}
      onPressedChange={(): void => {
        props.actions.toggleLevelFilter('warn');
      }}
      class='data-pressed:bg-yellow-500/15 data-pressed:text-yellow-500'
    >
      {m.debug_level_warn()}
    </Toggle>
    <Toggle
      size='sm'
      variant='outline'
      pressed={props.signals.levelFilters().error}
      onPressedChange={(): void => {
        props.actions.toggleLevelFilter('error');
      }}
      class='data-pressed:bg-red-500/15 data-pressed:text-red-400'
    >
      {m.debug_level_error()}
    </Toggle>
  </div>
);

const LogViewerHeader: Component<LogViewerHeaderProps> = (props) => (
  <div class='flex shrink-0 flex-col gap-2 p-2'>
    <InputGroup>
      <InputGroupAddon>
        <SearchIcon aria-hidden='true' />
      </InputGroupAddon>
      <InputGroupInput
        type='text'
        placeholder={m.debug_search_logs_placeholder()}
        value={props.signals.searchQuery()}
        onInput={(event): void => {
          props.signals.setSearchQuery(event.currentTarget.value);
        }}
      />
    </InputGroup>

    <div class='flex flex-wrap items-center gap-3'>
      <SourceFilters signals={props.signals} actions={props.actions} />
      <LevelFilters signals={props.signals} actions={props.actions} />
    </div>
  </div>
);

export { LogViewerHeader };

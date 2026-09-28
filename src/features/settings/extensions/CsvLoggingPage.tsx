import type { Component, Resource } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { H1, P } from '@manafishrov/ui/typography';
import DeleteIcon from '~icons/material-symbols/delete';
import DownloadIcon from '~icons/material-symbols/download';
import RefreshIcon from '~icons/material-symbols/refresh';

import * as m from '@/paraglide/messages';
import { capabilityStore } from '@/stores/capabilities';
import { requestCapability, saveCsv } from '@/tauri/capabilities';

import { listCsvFiles, type CsvFile } from './api';
import { ConfirmDeleteAlertDialog } from './ConfirmDeleteAlertDialog';
import { OperationFeedback } from './OperationFeedback';
import { createOperation, type Operation } from './operations';

const [undef] = [] as undefined[];
const KIBIBYTE = 1024;
const MEBIBYTE = KIBIBYTE * KIBIBYTE;
const formatSize = (bytes: number): string => {
  const formatter = new Intl.NumberFormat(undef, { maximumFractionDigits: 1 });
  if (bytes >= MEBIBYTE) {
    return `${formatter.format(bytes / MEBIBYTE)} MiB`;
  }
  if (bytes >= KIBIBYTE) {
    return `${formatter.format(bytes / KIBIBYTE)} KiB`;
  }
  return `${bytes} B`;
};

const CsvFileRow: Component<{
  file: CsvFile;
  operation: Operation;
  onDelete: (name: string) => void;
}> = (props) => (
  <li class='flex items-center justify-between gap-3 border-b border-border py-3 last:border-0'>
    <div class='min-w-0'>
      <p class='text-sm font-medium break-all'>{props.file.name}</p>
      <p class='text-xs text-muted-foreground'>
        {m.extensions_csv_rows({
          rows: props.file.rows,
          columns: props.file.columns,
          size: formatSize(props.file.size),
        })}
      </p>
    </div>
    <div class='flex shrink-0 gap-1'>
      <Button
        variant='ghost'
        size='icon'
        disabled={props.operation.busy()}
        aria-label={m.extensions_csv_download({ name: props.file.name })}
        onClick={() => {
          props.operation.run(() => saveCsv(props.file.name));
        }}
      >
        <DownloadIcon class='size-4' />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        disabled={props.operation.busy()}
        aria-label={m.extensions_csv_delete({ name: props.file.name })}
        onClick={() => {
          props.onDelete(props.file.name);
        }}
      >
        <DeleteIcon class='size-4' />
      </Button>
    </div>
  </li>
);

const CsvFiles: Component<{
  files: Resource<CsvFile[]>;
  operation: Operation;
  refetch: () => Promise<unknown>;
  onDelete: (name: string) => void;
}> = (props) => (
  <section class='flex flex-col gap-3'>
    <Button
      class='gap-2 self-start'
      variant='outline'
      disabled={props.files.loading || props.operation.busy()}
      onClick={() => {
        props.operation.run(() => Promise.resolve(props.refetch()));
      }}
    >
      <RefreshIcon class='size-4' />
      {m.extensions_csv_refresh()}
    </Button>
    <Show when={props.files.loading}>
      <p role='status' class='text-sm text-muted-foreground'>
        {m.extensions_csv_loading()}
      </p>
    </Show>
    <Show when={props.files.error}>
      <p role='alert' class='text-sm text-destructive'>
        {String(props.files.error)}
      </p>
    </Show>
    <Show when={props.files.state !== 'errored' && !props.files.loading}>
      <ul>
        <For each={props.files.latest} fallback={<P>{m.extensions_csv_empty()}</P>}>
          {(file) => (
            <CsvFileRow file={file} operation={props.operation} onDelete={props.onDelete} />
          )}
        </For>
      </ul>
    </Show>
    <OperationFeedback operation={props.operation} />
  </section>
);

export const CsvLoggingPage: Component = () => {
  const operation = createOperation();
  const [files, { refetch }] = createResource(() => capabilityStore.connected, listCsvFiles);
  const [deleteName, setDeleteName] = createSignal('');
  const remove = (): void => {
    const name = deleteName();
    setDeleteName('');
    operation.run(
      () => requestCapability('csv.delete', { name }).then(() => refetch()),
      m.extensions_csv_deleted(),
    );
  };
  return (
    <div class='flex flex-col gap-6'>
      <header class='flex flex-col gap-2'>
        <H1>{m.extensions_csv_title()}</H1>
        <P>{m.extensions_csv_description()}</P>
      </header>
      <Show when={capabilityStore.connected} fallback={<P>{m.extensions_csv_offline()}</P>}>
        <CsvFiles
          files={files}
          operation={operation}
          refetch={() => Promise.resolve(refetch())}
          onDelete={setDeleteName}
        />
      </Show>
      <ConfirmDeleteAlertDialog
        name={deleteName()}
        onCancel={() => setDeleteName('')}
        onConfirm={remove}
      />
    </div>
  );
};

import { Badge } from '@manafishrov/ui/badge';
import { Button } from '@manafishrov/ui/button';
import { Skeleton } from '@manafishrov/ui/skeleton';
import { For, Index, Show, createMemo, type Component } from 'solid-js';
import ChevronIcon from '~icons/material-symbols/keyboard-arrow-down';

import { ReleaseNotes } from '@/features/update/ReleaseNotes';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { VersionsStatus, sdFlashStore, type VersionEntryState } from '@/stores/sdFlash';
import { loadFirmwareVersions } from '@/tauri';

const [UNSET]: undefined[] = [];

const NOT_FOUND_INDEX = -1;
const SKELETON_COUNT = 5;

const VersionRowSkeleton: Component<{ expanded: boolean }> = (props) => (
  <div class='flex w-full flex-col overflow-hidden rounded-lg border border-border'>
    <div class='flex flex-col gap-1.5 p-3'>
      <span class='text-sm'>
        <Skeleton class='inline-block h-3.5 w-20 rounded align-middle' />
      </span>
      <span class='text-xs'>
        <Skeleton class='inline-block h-3 w-32 rounded align-middle' />
      </span>
    </div>
    <Show when={props.expanded}>
      <div class='flex flex-col gap-2 border-t border-border/60 p-3'>
        <Skeleton class='h-3 w-16 rounded' />
        <Skeleton class='h-3 w-full rounded' />
        <Skeleton class='h-3 w-5/6 rounded' />
      </div>
    </Show>
  </div>
);

const VersionListSkeleton: Component<{ expandedIndex: number | undefined }> = (props) => (
  <div class='flex flex-col gap-2'>
    <Index each={Array.from({ length: SKELETON_COUNT })}>
      {(_item, index) => <VersionRowSkeleton expanded={index === props.expandedIndex} />}
    </Index>
  </div>
);

const VersionListError: Component = () => (
  <div class='flex min-h-36 flex-col items-center justify-center gap-3 text-center'>
    <p class='text-sm text-muted-foreground'>
      {sdFlashStore.versionsError ?? m.sd_flash_versions_unavailable_description()}
    </p>
    <Button
      variant='outline'
      size='sm'
      onClick={(): void => {
        loadFirmwareVersions().catch(logError);
      }}
    >
      {m.sd_flash_button_retry()}
    </Button>
  </div>
);

const versionCardClass = (disabled: boolean, selected: boolean): string => {
  if (disabled) {
    return 'pointer-events-none border-border opacity-50';
  }

  if (selected) {
    return 'border-primary bg-primary/5 ring-1 ring-primary/50';
  }

  return 'border-border hover:bg-muted/40';
};

const VersionRow: Component<{
  entry: VersionEntryState;
  isLatest: boolean;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}> = (props) => (
  <div
    class={`flex flex-col overflow-hidden rounded-lg border transition-colors ${versionCardClass(props.disabled, props.selected)}`}
  >
    <button
      type='button'
      disabled={props.disabled}
      class='flex w-full items-center justify-between gap-2 p-3 text-left'
      onClick={props.onSelect}
    >
      <div class='flex min-w-0 flex-col gap-1.5'>
        <div class='flex min-w-0 items-center gap-2'>
          <span class='text-sm font-semibold'>{props.entry.version}</span>
          <Show when={props.isLatest}>
            <Badge class='bg-primary/10 px-1.5 py-0 text-[10px] text-primary'>
              {m.sd_flash_badge_latest()}
            </Badge>
          </Show>
          <Show when={props.entry.prerelease}>
            <Badge class='bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-600 dark:text-amber-400'>
              {m.sd_flash_badge_prerelease()}
            </Badge>
          </Show>
        </div>
        <p class='text-xs text-muted-foreground'>
          {m.sd_flash_published_at({
            date: new Date(props.entry.publishedAt).toLocaleDateString(),
          })}
        </p>
      </div>
      <ChevronIcon
        class={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${props.selected ? 'rotate-180' : ''}`}
      />
    </button>

    <Show when={props.selected}>
      <div class='border-t border-border/60 p-3'>
        <ReleaseNotes notes={props.entry.releaseNotes} />
      </div>
    </Show>
  </div>
);

export const VersionList: Component<{
  selectedVersion: string | undefined;
  disabled: boolean;
  onSelectVersion: (version: string) => void;
}> = (props) => {
  const status = createMemo(() => sdFlashStore.versionsStatus);
  const latestStableVersion = createMemo(() => {
    const stable = sdFlashStore.versions.find((entry) => !entry.prerelease);
    return stable ? stable.version : UNSET;
  });
  const expandedSkeletonIndex = createMemo(() => {
    const selected = props.selectedVersion;
    if (typeof selected !== 'string') {
      return UNSET;
    }
    const index = sdFlashStore.versions.findIndex((entry) => entry.version === selected);
    return index === NOT_FOUND_INDEX ? UNSET : index;
  });

  return (
    <Show
      when={status() === VersionsStatus.ready && sdFlashStore.versions.length > 0}
      fallback={
        <Show
          when={status() === VersionsStatus.loading || status() === VersionsStatus.idle}
          fallback={<VersionListError />}
        >
          <VersionListSkeleton expandedIndex={expandedSkeletonIndex()} />
        </Show>
      }
    >
      <div class='flex flex-col gap-2'>
        <For each={sdFlashStore.versions}>
          {(entry) => (
            <VersionRow
              entry={entry}
              isLatest={entry.version === latestStableVersion()}
              selected={props.selectedVersion === entry.version}
              disabled={props.disabled}
              onSelect={(): void => {
                props.onSelectVersion(entry.version);
              }}
            />
          )}
        </For>
      </div>
    </Show>
  );
};

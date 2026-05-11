import { Badge } from '@manafishrov/ui/badge';
import { Button } from '@manafishrov/ui/button';
import { Skeleton } from '@manafishrov/ui/skeleton';
import { For, Index, Show, createMemo, type Component } from 'solid-js';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { VersionsStatus, sdFlashStore, type VersionEntryState } from '@/stores/sdFlash';
import { loadFirmwareVersions } from '@/tauri';

const [UNSET]: undefined[] = [];

const SKELETON_COUNT = 4;

const VersionRowSkeleton: Component = () => (
  <div class='flex w-full flex-col gap-1.5 rounded-lg border border-border p-3'>
    <span class='text-sm'>
      <Skeleton class='inline-block h-3.5 w-20 rounded align-middle' />
    </span>
    <span class='text-xs'>
      <Skeleton class='inline-block h-3 w-32 rounded align-middle' />
    </span>
  </div>
);

const VersionListSkeleton: Component = () => (
  <div class='flex flex-col gap-2'>
    <Index each={Array.from({ length: SKELETON_COUNT })}>{() => <VersionRowSkeleton />}</Index>
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

const versionRowClass = (disabled: boolean, selected: boolean): string => {
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
  <button
    type='button'
    disabled={props.disabled}
    class={`flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors ${versionRowClass(props.disabled, props.selected)}`}
    onClick={props.onSelect}
  >
    <div class='flex items-center justify-between gap-2'>
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
    </div>

    <p class='text-xs text-muted-foreground'>
      {m.sd_flash_published_at({
        date: new Date(props.entry.publishedAt).toLocaleDateString(),
      })}
    </p>
  </button>
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

  return (
    <Show
      when={status() === VersionsStatus.ready && sdFlashStore.versions.length > 0}
      fallback={
        <Show
          when={status() === VersionsStatus.loading || status() === VersionsStatus.idle}
          fallback={<VersionListError />}
        >
          <VersionListSkeleton />
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

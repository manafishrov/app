import { Badge } from '@manafishrov/ui/badge';
import { Button } from '@manafishrov/ui/button';
import { Skeleton } from '@manafishrov/ui/skeleton';
import { For, Index, Show, createMemo, type Component } from 'solid-js';
import ChevronIcon from '~icons/material-symbols/keyboard-arrow-down';

import { ConfirmUpdateButton } from '@/features/update/ConfirmUpdateButton';
import { ReleaseNotes } from '@/features/update/ReleaseNotes';
import { logError } from '@/lib/log';
import { compareVersions } from '@/lib/version';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { ReleasesStatus, updatesStore, type AppReleaseEntry } from '@/stores/updates';
import { installAppReleaseVersion, loadAppReleases } from '@/tauri';

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
        <Skeleton class='mt-1 h-8 w-24 rounded-md' />
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
      {updatesStore.releases.error ?? m.app_versions_unavailable_description()}
    </p>
    <Button
      variant='outline'
      size='sm'
      onClick={(): void => {
        loadAppReleases().catch(logError);
      }}
    >
      {m.app_versions_button_retry()}
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

const VersionRowBadges: Component<{
  isCurrent: boolean;
  isLatestStable: boolean;
  prerelease: boolean;
}> = (props) => (
  <>
    <Show when={props.isCurrent}>
      <Badge class='bg-primary/10 px-1.5 py-0 text-[10px] text-primary'>
        {m.app_versions_badge_current()}
      </Badge>
    </Show>
    <Show when={props.isLatestStable}>
      <Badge class='bg-primary/10 px-1.5 py-0 text-[10px] text-primary'>
        {m.app_versions_badge_latest()}
      </Badge>
    </Show>
    <Show when={props.prerelease}>
      <Badge class='bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-600 dark:text-amber-400'>
        {m.app_versions_badge_prerelease()}
      </Badge>
    </Show>
  </>
);

const isDowngrade = (version: string): boolean => {
  const comparison = compareVersions(version, configStore.appVersion);
  return typeof comparison === 'number' && comparison < 0;
};

const InstallConfirmDescription: Component<{ entry: AppReleaseEntry }> = (props) => (
  <div class='space-y-2'>
    <p>
      {m.app_versions_install_confirm_description({
        version: props.entry.version,
        current: configStore.appVersion,
      })}
    </p>
    <Show when={props.entry.prerelease}>
      <p class='text-amber-600 dark:text-amber-400'>
        {m.app_versions_install_confirm_prerelease({ version: props.entry.version })}
      </p>
    </Show>
    <Show when={isDowngrade(props.entry.version)}>
      <p class='text-amber-600 dark:text-amber-400'>
        {m.app_versions_install_confirm_downgrade({
          version: props.entry.version,
          current: configStore.appVersion,
        })}
      </p>
    </Show>
  </div>
);

const VersionRowFooter: Component<{
  entry: AppReleaseEntry;
  disabled: boolean;
  isCurrent: boolean;
  installing: boolean;
  onInstall: () => Promise<void> | void;
}> = (props) => (
  <div class='flex flex-col gap-3 border-t border-border/60 p-3'>
    <ReleaseNotes notes={props.entry.releaseNotes} />
    <ConfirmUpdateButton
      buttonLabel={
        props.installing
          ? m.app_versions_install_pending()
          : m.app_versions_install({ version: props.entry.version })
      }
      confirmLabel={m.app_versions_install_confirm_action()}
      disabled={props.disabled || props.isCurrent}
      title={m.app_versions_install_confirm_title({ version: props.entry.version })}
      description={<InstallConfirmDescription entry={props.entry} />}
      onConfirm={props.onInstall}
    />
  </div>
);

const VersionRow: Component<{
  entry: AppReleaseEntry;
  isCurrent: boolean;
  isLatestStable: boolean;
  selected: boolean;
  disabled: boolean;
  installing: boolean;
  onSelect: () => void;
  onInstall: () => Promise<void> | void;
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
          <VersionRowBadges
            isCurrent={props.isCurrent}
            isLatestStable={props.isLatestStable}
            prerelease={props.entry.prerelease}
          />
        </div>
        <p class='text-xs text-muted-foreground'>
          {m.app_versions_published_at({
            date: new Date(props.entry.publishedAt).toLocaleDateString(),
          })}
        </p>
      </div>
      <ChevronIcon
        class={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${props.selected ? 'rotate-180' : ''}`}
      />
    </button>

    <Show when={props.selected}>
      <VersionRowFooter
        entry={props.entry}
        disabled={props.disabled}
        isCurrent={props.isCurrent}
        installing={props.installing}
        onInstall={props.onInstall}
      />
    </Show>
  </div>
);

const VersionRows: Component<{
  selectedTag: string | undefined;
  onSelectTag: (tag: string) => void;
}> = (props) => {
  const isInstalling = createMemo(() => typeof updatesStore.releases.installingTag === 'string');
  const latestStableVersion = createMemo(() => {
    const stable = updatesStore.releases.entries.find((entry) => !entry.prerelease);
    return stable ? stable.version : UNSET;
  });

  return (
    <div class='flex flex-col gap-2'>
      <For each={updatesStore.releases.entries}>
        {(entry) => (
          <VersionRow
            entry={entry}
            isCurrent={entry.version === configStore.appVersion}
            isLatestStable={entry.version === latestStableVersion()}
            selected={props.selectedTag === entry.tag}
            disabled={isInstalling()}
            installing={updatesStore.releases.installingTag === entry.tag}
            onSelect={(): void => {
              props.onSelectTag(entry.tag);
            }}
            onInstall={(): Promise<void> => installAppReleaseVersion(entry.tag)}
          />
        )}
      </For>
    </div>
  );
};

export const AppVersionList: Component<{
  selectedTag: string | undefined;
  onSelectTag: (tag: string) => void;
}> = (props) => {
  const status = createMemo(() => updatesStore.releases.status);
  const expandedSkeletonIndex = createMemo(() => {
    const selected = props.selectedTag;
    if (typeof selected !== 'string') {
      return UNSET;
    }
    const index = updatesStore.releases.entries.findIndex((entry) => entry.tag === selected);
    return index === NOT_FOUND_INDEX ? UNSET : index;
  });

  return (
    <Show
      when={status() === ReleasesStatus.ready && updatesStore.releases.entries.length > 0}
      fallback={
        <Show
          when={status() === ReleasesStatus.loading || status() === ReleasesStatus.idle}
          fallback={<VersionListError />}
        >
          <VersionListSkeleton expandedIndex={expandedSkeletonIndex()} />
        </Show>
      }
    >
      <VersionRows selectedTag={props.selectedTag} onSelectTag={props.onSelectTag} />
    </Show>
  );
};

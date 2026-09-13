import { Button } from '@manafishrov/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@manafishrov/ui/card';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';
import { Show, createSignal, type Component } from 'solid-js';
import RefreshIcon from '~icons/material-symbols/refresh';

import { VersionBadge } from '@/components/VersionBadge';
import { General } from '@/features/settings/forms/General';
import { AppVersionList } from '@/features/update/AppVersionList';
import { ConfirmUpdateButton } from '@/features/update/ConfirmUpdateButton';
import { ReleaseNotes } from '@/features/update/ReleaseNotes';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { ReleasesStatus, updatesStore } from '@/stores/updates';
import { checkForAppUpdates, installAppUpdate, isUpdaterEnabled, loadAppReleases } from '@/tauri';

const createAppUpdateStatusMessage = (): string => {
  switch (updatesStore.app.status) {
    case 'idle':
    case 'checking': {
      return m.general_settings_app_update_status_checking();
    }
    case 'installing': {
      return m.general_settings_app_update_status_installing();
    }
    case 'available': {
      return m.general_settings_app_update_status_available({
        version: updatesStore.app.latestVersion ?? m.common_not_available(),
      });
    }
    case 'upToDate':
    case 'readyToRestart': {
      return updatesStore.app.status === 'readyToRestart'
        ? m.general_settings_app_update_status_ready_to_restart()
        : m.general_settings_app_update_status_up_to_date();
    }
    case 'error': {
      return updatesStore.app.error ?? m.general_settings_app_update_check_failed();
    }
    default: {
      return m.general_settings_app_update_check_failed();
    }
  }
};

const AppUpdateActions: Component = () => (
  <CardAction class='flex flex-wrap gap-2'>
    <Button
      variant='outline'
      disabled={updatesStore.app.status === 'checking'}
      onClick={(): void => {
        checkForAppUpdates().catch(logError);
      }}
    >
      {updatesStore.app.status === 'checking'
        ? m.general_settings_app_update_status_checking()
        : m.common_check_for_updates()}
    </Button>
    <ConfirmUpdateButton
      buttonLabel={m.general_settings_app_update_button()}
      confirmLabel={m.general_settings_app_update_button()}
      disabled={updatesStore.app.status !== 'available'}
      title={m.alerts_app_update_title()}
      description={<p>{m.alerts_app_update_description()}</p>}
      onConfirm={() => installAppUpdate()}
    />
  </CardAction>
);

const RefreshAppVersionsButton: Component<{ disabled: boolean }> = (props) => (
  <Tooltip positioning={{ placement: 'bottom' }}>
    <TooltipTrigger
      asChild={(tooltipProps) => (
        <Button
          {...tooltipProps()}
          variant='ghost'
          size='icon'
          class='h-8 w-8 shrink-0'
          disabled={props.disabled}
          onClick={(): void => {
            loadAppReleases().catch(logError);
          }}
        >
          <RefreshIcon class='h-4 w-4' />
        </Button>
      )}
    />
    <TooltipPositioner>
      <TooltipContent>
        <span>{m.app_versions_refresh()}</span>
        <TooltipArrow />
      </TooltipContent>
    </TooltipPositioner>
  </Tooltip>
);

const isReleasesBusy = (): boolean =>
  typeof updatesStore.releases.installingTag === 'string' ||
  updatesStore.releases.status === ReleasesStatus.loading;

const AppVersionPicker: Component = () => {
  const [open, setOpen] = createSignal(false);
  const [selectedTag, setSelectedTag] = createSignal<string>();

  const toggle = (): void => {
    const next = !open();
    setOpen(next);
    if (next && updatesStore.releases.status === ReleasesStatus.idle) {
      loadAppReleases().catch(logError);
    }
  };

  return (
    <div class='flex flex-col gap-3 border-t border-border pt-4'>
      <div class='flex items-center justify-between gap-2'>
        <Button variant='ghost' size='sm' class='self-start' onClick={toggle}>
          {open() ? m.app_versions_hide() : m.app_versions_show()}
        </Button>
        <Show when={open()}>
          <RefreshAppVersionsButton disabled={isReleasesBusy()} />
        </Show>
      </div>
      <Show when={open()}>
        <p class='text-sm text-muted-foreground'>{m.app_versions_picker_description()}</p>
        <AppVersionList selectedTag={selectedTag()} onSelectTag={setSelectedTag} />
      </Show>
    </div>
  );
};

const AppVersionCard: Component = () => (
  <Card class='my-8'>
    <CardHeader>
      <CardTitle>{m.general_settings_app_version_title()}</CardTitle>
      <CardDescription>{m.general_settings_app_version_description()}</CardDescription>
      <Show when={isUpdaterEnabled}>
        <AppUpdateActions />
      </Show>
    </CardHeader>
    <CardContent class='flex flex-col gap-4'>
      <div class='flex flex-wrap items-center gap-3'>
        <VersionBadge version={configStore.appVersion} />
        <p class='text-sm text-muted-foreground'>
          {isUpdaterEnabled
            ? createAppUpdateStatusMessage()
            : m.general_settings_app_update_managed_externally()}
        </p>
      </div>
      <Show when={isUpdaterEnabled && updatesStore.app.status === 'available'}>
        <ReleaseNotes notes={updatesStore.app.releaseNotes} />
      </Show>
      <Show when={isUpdaterEnabled}>
        <AppVersionPicker />
      </Show>
    </CardContent>
  </Card>
);

const GeneralSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.general_settings_page_title()}</H1>
      <P>{m.general_settings_page_description()}</P>
    </div>
    <AppVersionCard />
    <General />
  </>
);

export const Route = createFileRoute('/settings/')({
  component: GeneralSettingsPage,
});

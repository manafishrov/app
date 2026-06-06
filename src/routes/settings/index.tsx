import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { Button } from '@manafishrov/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@manafishrov/ui/card';
import { H1, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { General } from '@/features/settings/forms/General';
import { ConfirmUpdateButton } from '@/features/update/ConfirmUpdateButton';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { updatesStore } from '@/stores/updates';
import { checkForAppUpdates, installAppUpdate, isUpdaterEnabled } from '@/tauri';

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

const GeneralSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.general_settings_page_title()}</H1>
      <P>{m.general_settings_page_description()}</P>
    </div>
    <Card class='my-8'>
      <CardHeader>
        <CardTitle>{m.general_settings_app_version_title()}</CardTitle>
        <CardDescription>{m.general_settings_app_version_description()}</CardDescription>
        <Show when={isUpdaterEnabled}>
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
        </Show>
      </CardHeader>
      <CardContent>
        <div class='flex flex-wrap items-center gap-3'>
          <Badge class='bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
            v{configStore.appVersion}
          </Badge>
          <p class='text-sm text-muted-foreground'>
            {isUpdaterEnabled
              ? createAppUpdateStatusMessage()
              : m.general_settings_app_update_managed_externally()}
          </p>
        </div>
      </CardContent>
    </Card>
    <General />
  </>
);

export const Route = createFileRoute('/settings/')({
  component: GeneralSettingsPage,
});

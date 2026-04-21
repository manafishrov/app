import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { H1, H4, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { General } from '@/features/settings/forms/General';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';

const GeneralSettingsPage: Component = () => (
  <>
    <div class='mb-6 flex flex-col gap-2'>
      <H1>{m.general_settings_page_title()}</H1>
      <P>{m.general_settings_page_description()}</P>
    </div>
    <div class='my-8'>
      <H4>{m.general_settings_app_version_title()}</H4>
      <p class='text-sm text-muted-foreground'>{m.general_settings_app_version_description()}</p>
      <Badge class='mt-2 bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
        v{configStore.appVersion}
      </Badge>
    </div>
    <General />
  </>
);

export const Route = createFileRoute('/settings/')({
  component: GeneralSettingsPage,
});

import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { H1, H4, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { General } from '@/components/settings/forms/General';
import { configStore } from '@/stores/config';

const GeneralSettingsPage: Component = () => {
  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <H1>General</H1>
        <P>Generic settings for the Manafish application.</P>
      </div>
      <div class='space-y-8'>
        <div>
          <H4>App Version</H4>
          <p class='text-muted-foreground text-sm'>Current version of the Manafish application.</p>
          <Badge class='bg-primary/10 text-primary mt-2 px-3 py-1 text-sm font-medium'>
            v{configStore.appVersion}
          </Badge>
        </div>
        <General />
      </div>
    </>
  );
};

export const Route = createFileRoute('/settings/')({
  component: GeneralSettingsPage,
});

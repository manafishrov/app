import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { H1, H4, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';

import { rovConfigStore } from '@/stores/rovConfig';

const SystemRovSettingsPage: Component = () => {
  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <H1>System</H1>
        <P>System settings for the Manafish firmware.</P>
      </div>
      <div class='space-y-8'>
        <div>
          <H4>Firmware Version</H4>
          <p class='text-muted-foreground text-sm'>Current version of the Manafish firmware.</p>
          <Badge class='bg-primary/10 text-primary mt-2 px-3 py-1 text-sm font-medium'>
            v{rovConfigStore.firmwareVersion}
          </Badge>
        </div>
      </div>
    </>
  );
};

export const Route = createFileRoute('/settings/rov/system/')({
  component: SystemRovSettingsPage,
});

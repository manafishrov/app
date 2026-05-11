import { Button } from '@manafishrov/ui/button';
import { Separator } from '@manafishrov/ui/separator';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import { H1, H3, P } from '@manafishrov/ui/typography';
import { createFileRoute } from '@tanstack/solid-router';
import { createSignal, onMount, type Component } from 'solid-js';
import RefreshIcon from '~icons/material-symbols/refresh';

import { DriveList } from '@/features/sdFlash/DriveList';
import { FlashAction } from '@/features/sdFlash/FlashAction';
import { VersionList } from '@/features/sdFlash/VersionList';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { VersionsStatus, isPipelineRunning, sdFlashStore } from '@/stores/sdFlash';
import { loadFirmwareVersions, refreshFlashDrives } from '@/tauri';

const RefreshFirmwareButton: Component<{ disabled: boolean }> = (props) => (
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
            loadFirmwareVersions().catch(logError);
          }}
        >
          <RefreshIcon class='h-4 w-4' />
        </Button>
      )}
    />
    <TooltipPositioner>
      <TooltipContent>
        <span>{m.sd_flash_refresh_firmware()}</span>
        <TooltipArrow />
      </TooltipContent>
    </TooltipPositioner>
  </Tooltip>
);

const useInitialLoad = (): void => {
  onMount(() => {
    if (sdFlashStore.versionsStatus === VersionsStatus.idle) {
      loadFirmwareVersions().catch(logError);
    }
    if (sdFlashStore.drives.length === 0) {
      refreshFlashDrives().catch(logError);
    }
  });
};

const SdCardPage: Component = () => {
  const [selectedVersion, setSelectedVersion] = createSignal<string>();
  useInitialLoad();

  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <H1>{m.sd_flash_page_title()}</H1>
        <P>{m.sd_flash_page_description()}</P>
      </div>

      <div class='flex flex-col gap-8'>
        <section>
          <div class='mb-3 flex items-center justify-between'>
            <H3>{m.sd_flash_step_firmware()}</H3>
            <RefreshFirmwareButton disabled={isPipelineRunning()} />
          </div>
          <VersionList
            selectedVersion={selectedVersion()}
            disabled={isPipelineRunning()}
            onSelectVersion={(version: string): void => {
              setSelectedVersion(version);
            }}
          />
        </section>

        <Separator />

        <section>
          <H3 class='mb-3'>{m.sd_flash_step_sd_card()}</H3>
          <DriveList disabled={isPipelineRunning()} />
        </section>

        <Separator />

        <section>
          <H3 class='mb-3'>{m.sd_flash_step_flash()}</H3>
          <FlashAction selectedVersion={selectedVersion()} />
        </section>
      </div>
    </>
  );
};

export const Route = createFileRoute('/settings/sd-card/')({
  component: SdCardPage,
});

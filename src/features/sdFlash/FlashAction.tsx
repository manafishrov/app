import type { Component } from 'solid-js';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPositioner,
  AlertDialogTitle,
} from '@manafishrov/ui/alert-dialog';
import { Button } from '@manafishrov/ui/button';
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from '@manafishrov/ui/progress';
import { Show, createEffect, createMemo, createSignal } from 'solid-js';
import { Portal } from 'solid-js/web';

import { ConfirmUpdateButton } from '@/features/update/ConfirmUpdateButton';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import {
  PipelineStatus,
  isPipelineRunning,
  sdFlashStore,
  type VersionEntryState,
} from '@/stores/sdFlash';
import { cancelFirmwareFlash, startFirmwareFlash } from '@/tauri';

const BYTES_PER_MB = 1_000_000;

const isFlashing = (): boolean =>
  sdFlashStore.flash.status === PipelineStatus.flashing ||
  sdFlashStore.flash.status === PipelineStatus.flashingVerifying;

const isPreparing = (): boolean => sdFlashStore.flash.status === PipelineStatus.preparing;

const isIndeterminate = (): boolean =>
  isPreparing() ||
  isFlashing() ||
  sdFlashStore.flash.status === PipelineStatus.verifying ||
  sdFlashStore.flash.status === PipelineStatus.flashingVerifying;

const pipelineLabel = (): string => {
  const { status, activeVersion } = sdFlashStore.flash;
  const version = activeVersion ?? '';
  if (status === PipelineStatus.preparing) {
    return m.sd_flash_preparing();
  }
  if (status === PipelineStatus.downloading) {
    return m.sd_flash_downloading_version({ version });
  }
  if (status === PipelineStatus.verifying) {
    return m.sd_flash_verifying_signature();
  }
  if (status === PipelineStatus.flashingVerifying) {
    return m.firmware_update_status_flashing_verifying();
  }
  return m.sd_flash_flashing_version({ version });
};

const pipelinePercent = (): number | undefined => {
  if (isIndeterminate()) {
    return undefined;
  }
  return sdFlashStore.flash.downloadPercent ?? 0;
};

const PipelineProgress: Component = () => (
  <div class='flex flex-col gap-3'>
    <Progress value={pipelinePercent()}>
      <div class='flex items-center justify-between'>
        <ProgressLabel>{pipelineLabel()}</ProgressLabel>
        <Show when={!isIndeterminate()}>
          <ProgressValue />
        </Show>
      </div>
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </Progress>
    <Show when={isFlashing() && sdFlashStore.flash.status !== PipelineStatus.flashingVerifying}>
      <p class='text-xs text-muted-foreground tabular-nums'>
        {((sdFlashStore.flash.bytesPerSecond ?? 0) / BYTES_PER_MB).toFixed(1)} MB/s
      </p>
    </Show>
    <Button
      variant='outline'
      size='sm'
      class='ml-auto'
      onClick={(): void => {
        cancelFirmwareFlash().catch(logError);
      }}
    >
      {m.firmware_update_button_cancel_flash()}
    </Button>
  </div>
);

const FlashSuccessDialog: Component<{
  open: boolean;
  onClose: () => void;
}> = (props) => (
  <AlertDialog
    open={props.open}
    onOpenChange={(details): void => {
      if (!details.open) {
        props.onClose();
      }
    }}
  >
    <Portal>
      <AlertDialogOverlay />
      <AlertDialogPositioner>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.sd_flash_success_title()}</AlertDialogTitle>
            <AlertDialogDescription>{m.sd_flash_flash_status_flashed()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={props.onClose}>{m.common_ok()}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPositioner>
    </Portal>
  </AlertDialog>
);

const getButtonText = (entry: VersionEntryState | null): string => {
  if (isPipelineRunning()) {
    return m.sd_flash_action_flashing();
  }
  if (entry === null) {
    return m.sd_flash_action_select_firmware_first();
  }
  if (sdFlashStore.selectedDevice === null) {
    return m.sd_flash_action_select_sd_card_first();
  }
  return m.sd_flash_action_ready();
};

const useFlashState = (getVersion: () => string | null) => {
  const selectedEntry = createMemo(() => {
    const version = getVersion();
    if (version === null) {
      return null;
    }
    return sdFlashStore.versions.find((entry) => entry.version === version) ?? null;
  });

  const canFlash = createMemo(() => {
    const entry = selectedEntry();
    return entry !== null && sdFlashStore.selectedDevice !== null && !isPipelineRunning();
  });

  return { canFlash, buttonText: createMemo(() => getButtonText(selectedEntry())) };
};

export const FlashAction: Component<{
  selectedVersion: string | null;
}> = (props) => {
  const { canFlash, buttonText } = useFlashState(() => props.selectedVersion);
  const [showSuccess, setShowSuccess] = createSignal(false);

  createEffect(() => {
    if (sdFlashStore.flash.status === PipelineStatus.flashed) {
      setShowSuccess(true);
    }
  });

  return (
    <div class='flex flex-col gap-4'>
      <Show when={isPipelineRunning()}>
        <PipelineProgress />
      </Show>

      <Show when={!isPipelineRunning()}>
        <ConfirmUpdateButton
          buttonLabel={buttonText()}
          confirmLabel={m.sd_flash_action_ready()}
          disabled={!canFlash()}
          title={m.sd_flash_confirm_title()}
          description={
            <div class='space-y-2'>
              <p>{m.sd_flash_confirm_data_loss()}</p>
              <p>{m.sd_flash_confirm_config_replaced()}</p>
            </div>
          }
          onConfirm={() => {
            const version = props.selectedVersion;
            if (version === null) {
              return;
            }
            return startFirmwareFlash(version);
          }}
        />
      </Show>

      <FlashSuccessDialog
        open={showSuccess()}
        onClose={(): void => {
          setShowSuccess(false);
        }}
      />
    </div>
  );
};

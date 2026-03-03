import { Badge } from '@manafishrov/ui/badge';
import { Button } from '@manafishrov/ui/button';
import { Spinner } from '@manafishrov/ui/spinner';
import { toast } from '@manafishrov/ui/toaster';
import { createFileRoute } from '@tanstack/solid-router';
import { invoke } from '@tauri-apps/api/core';
import { type Component, Show } from 'solid-js';

import { logError } from '@/lib/log';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { firmwareVersionStore } from '@/stores/firmwareVersion';
import { rovConfigStore } from '@/stores/rovConfig';

const General: Component = () => {
  const flashMicrocontrollerFirmware = async () => {
    await invoke('flash_microcontroller_firmware', {
      payload: rovConfigStore.microcontrollerFirmwareVariant,
    }).catch((error) => {
      logError('Failed to flash microcontroller firmware:', error);
      toast.create({ title: 'Failed to flash microcontroller firmware', type: 'error' });
    });
  };

  const firmware = () => firmwareVersionStore;

  return (
    <>
      <div class='mb-6 flex flex-col gap-2'>
        <h1 class='text-4xl font-extrabold tracking-tight'>General</h1>
        <p class='text-muted-foreground'>Generic settings for the Manafish ROV.</p>
      </div>
      <Show
        when={connectionStatusStore.isConnected && rovConfigStore}
        fallback={
          <div class='flex h-96 w-full items-center justify-center'>
            <Spinner class='size-8' />
          </div>
        }
      >
        <div class='space-y-6'>
          {firmware() && (
            <div>
              <h4 class='text-lg font-medium'>Firmware version</h4>
              <p class='text-muted-foreground text-sm'>
                Current version of the Manafish ROV firmware.
              </p>
              <Badge class='bg-primary/10 text-primary mt-2 rounded-full px-3 py-1 text-sm font-medium'>
                v{firmware()}
              </Badge>
            </div>
          )}
          <div>
            <h4 class='text-lg font-medium'>Microcontroller firmware</h4>
            <p class='text-muted-foreground text-sm'>
              Select and flash the firmware for the microcontroller.
            </p>
            <div class='mt-2 flex items-center gap-3'>
              <Button onClick={flashMicrocontrollerFirmware}>Flash</Button>
            </div>
          </div>
          <div>
            <h4 class='text-lg font-medium'>Fluid type</h4>
            <p class='text-muted-foreground text-sm'>
              Set correct fluid type to get accurate water pressure readings.
            </p>
            <div class='mt-2' />
          </div>
          <div>
            <h4 class='text-lg font-medium'>Smoothing factor</h4>
            <p class='text-muted-foreground text-sm'>
              How much smoothing applied to the movement of the ROV.
            </p>
            <div class='mt-2' />
          </div>
        </div>
      </Show>
    </>
  );
};

export const Route = createFileRoute('/settings/general/')({
  component: General,
});

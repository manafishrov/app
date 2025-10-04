import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { firmwareVersionStore } from '@/stores/firmwareVersion';
import { rovConfigStore, setRovConfig } from '@/stores/rovConfig';

export const Route = createFileRoute('/settings/general/')({
  component: General,
});

function General() {
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );
  const rovConfig = useStore(rovConfigStore, (state) =>
    state
      ? {
          microcontrollerFirmwareVariant: state.microcontrollerFirmwareVariant,
          fluidType: state.fluidType,
        }
      : null,
  );
  const firmwareVersion = useStore(firmwareVersionStore);

  async function flashMicrocontrollerFirmware() {
    try {
      await invoke('flash_microcontroller_firmware', {
        payload: rovConfig?.microcontrollerFirmwareVariant,
      });
    } catch (error) {
      logError('Failed to flash microcontroller firmware:', error);
      toast.error('Failed to flash microcontroller firmware');
    }
  }

  return (
    <>
      <div className='mb-6 flex flex-col gap-2'>
        <h1 className='text-4xl font-extrabold tracking-tight'>General</h1>
        <p className='text-muted-foreground'>
          Generic settings for the Manafish ROV.
        </p>
      </div>
      {!isConnected || !rovConfig ? (
        <div className='flex h-96 w-full items-center justify-center'>
          <Spinner size='lg' />
        </div>
      ) : (
        <div className='space-y-6'>
          {firmwareVersion && (
            <div>
              <h4 className='text-lg font-medium'>Firmware Version</h4>
              <p className='text-muted-foreground text-sm'>
                Current version of the Manafish ROV firmware.
              </p>
              <Badge className='bg-primary/10 text-primary mt-2 rounded-full px-3 py-1 text-sm font-medium'>
                v{firmwareVersion}
              </Badge>
            </div>
          )}
          <div>
            <h4 className='text-lg font-medium'>Microcontroller Firmware</h4>
            <p className='text-muted-foreground text-sm'>
              Select and flash the firmware with the specified output protocol
              for the microcontroller that generates the control signals for the
              thrusters. <strong>DSHOT</strong> is a modern digital protocol
              that supports bi-directional communication, allowing reading of
              thruster RPM. However, it can be more sensitive to noise and may
              introduce higher latency if the ESCs are not powerful enough.{' '}
              <strong>PWM</strong> is the older analog protocol and does not
              support feedback, but it is generally more robust. It is
              recommended to use DSHOT first, and switch to PWM only if you
              encounter issues.
            </p>
            <div className='mt-2 flex items-center gap-3'>
              <Select
                value={rovConfig.microcontrollerFirmwareVariant}
                onValueChange={(value) =>
                  setRovConfig({
                    microcontrollerFirmwareVariant: value as 'pwm' | 'dshot',
                  })
                }
                disabled={!rovConfig}
              >
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Firmware</SelectLabel>
                    <SelectItem value='pwm'>PWM</SelectItem>
                    <SelectItem value='dshot'>DSHOT</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button onClick={flashMicrocontrollerFirmware}>Flash</Button>
            </div>
          </div>
          <div>
            <h4 className='text-lg font-medium'>Fluid Type</h4>
            <p className='text-muted-foreground text-sm'>
              Set correct fluid type to get accurate water pressure readings.
            </p>
            <div className='mt-2 flex items-center gap-3'>
              <Select
                value={rovConfig.fluidType}
                onValueChange={(value) =>
                  setRovConfig({
                    fluidType: value as 'freshwater' | 'saltwater',
                  })
                }
                disabled={!rovConfig}
              >
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Fluid Type</SelectLabel>
                    <SelectItem value='freshwater'>Freshwater</SelectItem>
                    <SelectItem value='saltwater'>Saltwater</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

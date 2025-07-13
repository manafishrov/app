import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';

import { Badge } from '@/components/ui/Badge';
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
          fluidType: state.fluidType,
        }
      : null,
  );
  const firmwareVersion = useStore(firmwareVersionStore);

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
            <h4 className='text-lg font-medium'>Fluid type</h4>
            <p className='text-muted-foreground text-sm'>
              Set correctfluidtype to get accurate pressure and temperature
              readings.
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
                  <SelectValue placeholder='Select fluid type' />
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

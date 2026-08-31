import { Button } from '@manafishrov/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@manafishrov/ui/card';
import { createSignal, Show, type Component, type JSXElement } from 'solid-js';

import { VersionBadge } from '@/components/VersionBadge';
import * as m from '@/paraglide/messages';
import { rovStatusStore } from '@/stores/rovStatus';

const getMcuFirmwareVersion = (): string => {
  const version = rovStatusStore.deviceInfo.mcuFirmwareVersion;
  if (version === '' || version === m.common_not_available()) {
    return m.common_not_available();
  }

  return version;
};

const getMcuFirmwareVersionStatus = (): string | null => {
  if (rovStatusStore.deviceInfo.mcuFirmwareVersionStatus === 'querying') {
    return m.general_rov_settings_mcu_firmware_version_status_querying();
  }
  if (rovStatusStore.deviceInfo.mcuFirmwareVersionStatus === 'notReported') {
    return m.general_rov_settings_mcu_firmware_version_status_not_reported();
  }
  return null;
};

export const McuFirmwareVersionCard: Component<{
  boardField: JSXElement;
  onFlashFirmware: () => Promise<void>;
  disabled?: boolean;
}> = (props) => {
  const [isPending, setIsPending] = createSignal(false);
  const flash = (): void => {
    if (isPending()) {
      return;
    }
    setIsPending(true);
    props.onFlashFirmware().then(
      () => setIsPending(false),
      () => setIsPending(false),
    );
  };

  return (
    <Card class='my-8'>
      <CardHeader>
        <CardTitle>{m.general_rov_settings_mcu_firmware_version_title()}</CardTitle>
        <CardDescription>
          {m.general_rov_settings_mcu_firmware_version_description()}
        </CardDescription>
        <CardAction class='flex flex-wrap gap-2'>
          <div class='w-32 [&_[data-slot=field-label]:empty]:hidden'>{props.boardField}</div>
          <Button type='button' disabled={(props.disabled ?? false) || isPending()} onClick={flash}>
            {m.general_rov_settings_mcu_firmware_flash_button()}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent class='flex flex-col gap-4'>
        <div class='flex flex-wrap items-center gap-3'>
          <VersionBadge version={getMcuFirmwareVersion()} />
          <Show when={getMcuFirmwareVersionStatus()}>
            {(status) => <p class='text-sm text-muted-foreground'>{status()}</p>}
          </Show>
        </div>
      </CardContent>
    </Card>
  );
};

import type { Component, JSXElement } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@manafishrov/ui/card';

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

export const McuFirmwareVersionCard: Component<{
  boardField: JSXElement;
  onFlashFirmware: () => Promise<void>;
  disabled?: boolean;
}> = (props) => (
  <Card class='my-8'>
    <CardHeader>
      <CardTitle>{m.general_rov_settings_mcu_firmware_version_title()}</CardTitle>
      <CardDescription>{m.general_rov_settings_mcu_firmware_version_description()}</CardDescription>
      <CardAction class='flex flex-wrap gap-2'>
        <div class='w-32 [&_[data-slot=field-label]:empty]:hidden'>{props.boardField}</div>
        <Button
          type='button'
          disabled={props.disabled}
          onClick={() => {
            props.onFlashFirmware().catch(() => null);
          }}
        >
          {m.general_rov_settings_mcu_firmware_flash_button()}
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent class='flex flex-col gap-4'>
      <div class='flex flex-wrap items-center gap-3'>
        <VersionBadge version={getMcuFirmwareVersion()} />
      </div>
    </CardContent>
  </Card>
);

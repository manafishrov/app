import type { Component, JSXElement } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import { Button } from '@manafishrov/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@manafishrov/ui/card';

import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';
import { rovStatusStore } from '@/stores/rovStatus';

const getMcuFirmwareVersion = (): string => {
  const { deviceInfo, deviceInfoAvailable } = rovStatusStore;
  const version = deviceInfoAvailable
    ? deviceInfo.mcuFirmwareVersion
    : (rovConfigStore.mcuFirmwareVersion ?? '');
  if (version === '' || version === m.common_not_available()) {
    return m.common_not_available();
  }

  return `v${version}`;
};

export const McuFirmwareVersionCard: Component<{
  boardField: JSXElement;
  onFlashFirmware: () => void;
}> = (props) => (
  <Card class='my-8'>
    <CardHeader>
      <CardTitle>{m.general_rov_settings_mcu_firmware_version_title()}</CardTitle>
      <CardDescription>{m.general_rov_settings_mcu_firmware_version_description()}</CardDescription>
      <CardAction class='flex flex-wrap gap-2'>
        <div class='w-32 [&_[data-slot=field-label]:empty]:hidden'>{props.boardField}</div>
        <Button type='button' onClick={props.onFlashFirmware}>
          {m.general_rov_settings_mcu_firmware_flash_button()}
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent class='flex flex-col gap-4'>
      <div class='flex flex-wrap items-center gap-3'>
        <Badge class='bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
          {getMcuFirmwareVersion()}
        </Badge>
      </div>
    </CardContent>
  </Card>
);

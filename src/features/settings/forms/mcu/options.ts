import { createListCollection } from '@ark-ui/solid/collection';

import * as m from '@/paraglide/messages';
import { CurrentSensingMode, DshotSpeed, McuBoard, ThrusterProtocol } from '@/stores/rovConfig';

export type SelectOption = { value: string; label: string; disabled?: boolean };
export type SelectCollection = ReturnType<typeof createListCollection<SelectOption>>;

export const createMcuBoards = (): SelectCollection =>
  createListCollection<SelectOption>({
    items: [
      { value: McuBoard.pico, label: m.general_rov_settings_mcu_board_pico() },
      { value: McuBoard.pico2, label: m.general_rov_settings_mcu_board_pico2() },
    ],
  });

export const createThrusterProtocols = (): SelectCollection =>
  createListCollection<SelectOption>({
    items: [
      { value: ThrusterProtocol.pwm, label: m.general_rov_settings_thruster_protocol_pwm() },
      { value: ThrusterProtocol.dshot, label: m.general_rov_settings_thruster_protocol_dshot() },
    ],
  });

export const createCurrentSensingModes = (): SelectCollection =>
  createListCollection<SelectOption>({
    items: [
      {
        value: CurrentSensingMode.sharedBus,
        label: m.general_rov_settings_current_sensing_mode_shared_bus(),
      },
      {
        value: CurrentSensingMode.perMotor,
        label: m.general_rov_settings_current_sensing_mode_per_motor(),
      },
    ],
  });

export const createDshotSpeeds = (
  board: (typeof McuBoard)[keyof typeof McuBoard],
): SelectCollection =>
  createListCollection<SelectOption>({
    items: [
      { value: String(DshotSpeed.dshot150), label: '150' },
      { value: String(DshotSpeed.dshot300), label: '300' },
      { value: String(DshotSpeed.dshot600), label: '600' },
      { value: String(DshotSpeed.dshot1200), label: '1200', disabled: board === McuBoard.pico },
    ],
  });

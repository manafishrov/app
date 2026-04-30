import type { Component, JSXElement } from 'solid-js';

import { createListCollection } from '@ark-ui/solid/collection';
import { Button } from '@manafishrov/ui/button';
import { type SelectFieldProps, useAppForm } from '@manafishrov/ui/form';
import { SelectItem } from '@manafishrov/ui/select';
import { z } from 'zod';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import {
  CurrentSensingMode,
  DshotSpeed,
  McuBoard,
  ThrusterProtocol,
  rovConfigStore,
  type RovConfig,
} from '@/stores/rovConfig';
import { flashMcuFirmware, setRovConfig } from '@/tauri';

type SelectOption = { value: string; label: string; disabled?: boolean };
type SelectCollection = ReturnType<typeof createListCollection<SelectOption>>;

const createMcuBoards = (): SelectCollection =>
  createListCollection<SelectOption>({
    items: [
      { value: McuBoard.pico as string, label: m.general_rov_settings_mcu_board_pico() },
      { value: McuBoard.pico2 as string, label: m.general_rov_settings_mcu_board_pico2() },
    ],
  });

const createThrusterProtocols = (): SelectCollection =>
  createListCollection<SelectOption>({
    items: [
      {
        value: ThrusterProtocol.pwm as string,
        label: m.general_rov_settings_thruster_protocol_pwm(),
      },
      {
        value: ThrusterProtocol.dshot as string,
        label: m.general_rov_settings_thruster_protocol_dshot(),
      },
    ],
  });

const createDshotSpeeds = (board: (typeof McuBoard)[keyof typeof McuBoard]): SelectCollection =>
  createListCollection<SelectOption>({
    items: [
      { value: String(DshotSpeed.dshot150), label: '150' },
      { value: String(DshotSpeed.dshot300), label: '300' },
      { value: String(DshotSpeed.dshot600), label: '600' },
      { value: String(DshotSpeed.dshot1200), label: '1200', disabled: board === McuBoard.pico },
    ],
  });

const createCurrentSensingModes = (): SelectCollection =>
  createListCollection<SelectOption>({
    items: [
      {
        value: CurrentSensingMode.sharedBus as string,
        label: m.general_rov_settings_current_sensing_mode_shared_bus(),
      },
      {
        value: CurrentSensingMode.perMotor as string,
        label: m.general_rov_settings_current_sensing_mode_per_motor(),
      },
    ],
  });

const formSchema = z.object({
  mcuBoard: z.array(z.enum([McuBoard.pico, McuBoard.pico2])).length(1),
  thrusterProtocol: z.array(z.enum([ThrusterProtocol.pwm, ThrusterProtocol.dshot])).length(1),
  dshotSpeed: z.array(z.enum(['150', '300', '600', '1200'])).length(1),
  currentSensingMode: z
    .array(z.enum([CurrentSensingMode.perMotor, CurrentSensingMode.sharedBus]))
    .length(1),
});

type McuFormValues = z.infer<typeof formSchema>;

const parseDshotSpeed = (
  value: string | undefined,
  fallback: (typeof DshotSpeed)[keyof typeof DshotSpeed],
): (typeof DshotSpeed)[keyof typeof DshotSpeed] => {
  switch (value ?? '') {
    case '150': {
      return DshotSpeed.dshot150;
    }
    case '300': {
      return DshotSpeed.dshot300;
    }
    case '600': {
      return DshotSpeed.dshot600;
    }
    case '1200': {
      return DshotSpeed.dshot1200;
    }
    default: {
      return fallback;
    }
  }
};

const getDshotSpeedFormValue = (
  value: (typeof DshotSpeed)[keyof typeof DshotSpeed],
): McuFormValues['dshotSpeed'][number] => {
  switch (value) {
    case DshotSpeed.dshot150: {
      return '150';
    }
    case DshotSpeed.dshot300: {
      return '300';
    }
    case DshotSpeed.dshot600: {
      return '600';
    }
    case DshotSpeed.dshot1200: {
      return '1200';
    }
    default: {
      return '300';
    }
  }
};

type ResolvedMcuConfig = Pick<
  RovConfig,
  'mcuBoard' | 'thrusterProtocol' | 'dshotSpeed' | 'currentSensingMode'
>;

const resolveFormValues = (value: McuFormValues): ResolvedMcuConfig => ({
  mcuBoard: value.mcuBoard[0] ?? rovConfigStore.mcuBoard,
  thrusterProtocol: value.thrusterProtocol[0] ?? rovConfigStore.thrusterProtocol,
  dshotSpeed: parseDshotSpeed(value.dshotSpeed[0], rovConfigStore.dshotSpeed),
  currentSensingMode: value.currentSensingMode[0] ?? rovConfigStore.currentSensingMode,
});

const submitMcuConfig = (value: McuFormValues): Promise<void> => {
  const resolved = resolveFormValues(value);
  const boardChanged = resolved.mcuBoard !== rovConfigStore.mcuBoard;
  const result = setRovConfig(resolved);

  if (boardChanged) {
    flashMcuFirmware(resolved.mcuBoard).catch((error: unknown): void => {
      logError('Failed to flash MCU firmware:', error);
    });
  }

  return result;
};

type AppFieldContext = {
  SelectField: Component<SelectFieldProps>;
};

type AppFieldComponent = Component<{
  name: 'mcuBoard' | 'thrusterProtocol' | 'dshotSpeed' | 'currentSensingMode';
  children: (field: AppFieldContext) => JSXElement;
}>;

const McuBoardField: Component<{
  AppField: AppFieldComponent;
  boards: SelectCollection;
  onFlashFirmware: () => void;
}> = (props) => (
  <props.AppField name='mcuBoard'>
    {(field: AppFieldContext): JSXElement => (
      <field.SelectField
        label={m.general_rov_settings_mcu_board_title()}
        description={m.general_rov_settings_mcu_board_description()}
        collection={props.boards}
        placeholder={m.general_rov_settings_mcu_board_select_placeholder()}
        trailingAddon={
          <Button
            class='w-20'
            type='button'
            variant='outline'
            onClick={props.onFlashFirmware}
            aria-label={m.general_rov_settings_mcu_board_title()}
          >
            {m.common_flash()}
          </Button>
        }
      >
        <For each={props.boards.items}>
          {(item: SelectOption): JSXElement => <SelectItem item={item}>{item.label}</SelectItem>}
        </For>
      </field.SelectField>
    )}
  </props.AppField>
);

const ThrusterProtocolField: Component<{
  AppField: AppFieldComponent;
  protocols: SelectCollection;
}> = (props) => (
  <props.AppField name='thrusterProtocol'>
    {(field: AppFieldContext): JSXElement => (
      <field.SelectField
        label={m.general_rov_settings_thruster_protocol_title()}
        description={m.general_rov_settings_thruster_protocol_description()}
        collection={props.protocols}
        placeholder={m.general_rov_settings_thruster_protocol_select_placeholder()}
      >
        <For each={props.protocols.items}>
          {(item: SelectOption): JSXElement => <SelectItem item={item}>{item.label}</SelectItem>}
        </For>
      </field.SelectField>
    )}
  </props.AppField>
);

const DshotSpeedField: Component<{
  AppField: AppFieldComponent;
  speeds: SelectCollection;
  disabled: boolean;
}> = (props) => (
  <props.AppField name='dshotSpeed'>
    {(field: AppFieldContext): JSXElement => (
      <field.SelectField
        label={m.general_rov_settings_dshot_speed_title()}
        description={m.general_rov_settings_dshot_speed_description()}
        collection={props.speeds}
        placeholder={m.general_rov_settings_dshot_speed_select_placeholder()}
        disabled={props.disabled}
      >
        <For each={props.speeds.items}>
          {(item: SelectOption): JSXElement => <SelectItem item={item}>{item.label}</SelectItem>}
        </For>
      </field.SelectField>
    )}
  </props.AppField>
);

const CurrentSensingModeField: Component<{
  AppField: AppFieldComponent;
  modes: SelectCollection;
}> = (props) => (
  <props.AppField name='currentSensingMode'>
    {(field: AppFieldContext): JSXElement => (
      <field.SelectField
        label={m.general_rov_settings_current_sensing_mode_title()}
        description={m.general_rov_settings_current_sensing_mode_description()}
        collection={props.modes}
        placeholder={m.general_rov_settings_current_sensing_mode_select_placeholder()}
      >
        <For each={props.modes.items}>
          {(item: SelectOption): JSXElement => <SelectItem item={item}>{item.label}</SelectItem>}
        </For>
      </field.SelectField>
    )}
  </props.AppField>
);

const getDefaultFormValues = (): McuFormValues => ({
  mcuBoard: [rovConfigStore.mcuBoard],
  thrusterProtocol: [rovConfigStore.thrusterProtocol],
  dshotSpeed: [getDshotSpeedFormValue(rovConfigStore.dshotSpeed)],
  currentSensingMode: [rovConfigStore.currentSensingMode],
});

const handleFlashFirmware = (): void => {
  flashMcuFirmware(rovConfigStore.mcuBoard).catch((error: unknown): void => {
    logError('Failed to flash MCU firmware:', error);
  });
};

export const Mcu: Component = () => {
  const boards = createMcuBoards();
  const protocols = createThrusterProtocols();
  const dshotSpeeds = createDshotSpeeds(rovConfigStore.mcuBoard);
  const currentSensingModes = createCurrentSensingModes();
  const form = useAppForm(() => ({
    validators: { onChange: formSchema, onSubmit: formSchema },
    defaultValues: getDefaultFormValues(),
    onSubmit: ({ value }: { value: McuFormValues }): Promise<void> => submitMcuConfig(value),
  }));

  return (
    <form.AppForm>
      <form.Form>
        <McuBoardField
          AppField={form.AppField}
          boards={boards}
          onFlashFirmware={handleFlashFirmware}
        />
        <ThrusterProtocolField AppField={form.AppField} protocols={protocols} />
        <DshotSpeedField
          AppField={form.AppField}
          speeds={dshotSpeeds}
          disabled={rovConfigStore.thrusterProtocol !== ThrusterProtocol.dshot}
        />
        <CurrentSensingModeField AppField={form.AppField} modes={currentSensingModes} />
        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};

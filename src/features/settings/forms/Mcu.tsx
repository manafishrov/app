import { createListCollection } from '@ark-ui/solid/collection';
import { Button } from '@manafishrov/ui/button';
import { type SelectFieldProps, useAppForm } from '@manafishrov/ui/form';
import { SelectItem } from '@manafishrov/ui/select';
import { createMemo, type Component, type JSXElement } from 'solid-js';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import {
  CurrentSensingMode,
  DshotSpeed,
  McuBoard,
  ThrusterProtocol,
  rovConfigStore,
} from '@/stores/rovConfig';
import { flashMcuFirmware, setRovConfig } from '@/tauri';

import {
  formSchema,
  getCompatibleDshotSpeed,
  getDshotSpeedFormValue,
  parseDshotSpeed,
  type McuFormValues,
} from './mcu/schema';
import { updateMcuConfig, type ResolvedMcuConfig } from './mcu/update';

type SelectOption = { value: string; label: string; disabled?: boolean };
type SelectCollection = ReturnType<typeof createListCollection<SelectOption>>;

const createMcuBoards = (): SelectCollection =>
  createListCollection<SelectOption>({
    items: [
      { value: McuBoard.pico, label: m.general_rov_settings_mcu_board_pico() },
      { value: McuBoard.pico2, label: m.general_rov_settings_mcu_board_pico2() },
    ],
  });

const createThrusterProtocols = (): SelectCollection =>
  createListCollection<SelectOption>({
    items: [
      {
        value: ThrusterProtocol.pwm,
        label: m.general_rov_settings_thruster_protocol_pwm(),
      },
      {
        value: ThrusterProtocol.dshot,
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
        value: CurrentSensingMode.sharedBus,
        label: m.general_rov_settings_current_sensing_mode_shared_bus(),
      },
      {
        value: CurrentSensingMode.perMotor,
        label: m.general_rov_settings_current_sensing_mode_per_motor(),
      },
    ],
  });

const resolveFormValues = (value: McuFormValues): ResolvedMcuConfig => ({
  mcuBoard: value.mcuBoard[0] ?? rovConfigStore.mcuBoard,
  thrusterProtocol: value.thrusterProtocol[0] ?? rovConfigStore.thrusterProtocol,
  dshotSpeed: parseDshotSpeed(value.dshotSpeed[0], rovConfigStore.dshotSpeed),
  currentSensingMode: value.currentSensingMode[0] ?? rovConfigStore.currentSensingMode,
});

const flashMcuFirmwareWithLogging = (board: ResolvedMcuConfig['mcuBoard']): Promise<void> =>
  flashMcuFirmware(board).catch((error: unknown): never => {
    logError('Failed to flash MCU firmware:', error);
    throw error;
  });

const submitMcuConfig = (value: McuFormValues): Promise<void> => {
  const resolved = resolveFormValues(value);
  const previousBoard = rovConfigStore.mcuBoard;

  return updateMcuConfig(
    { config: resolved, previousBoard },
    { setConfig: setRovConfig, flashFirmware: flashMcuFirmwareWithLogging },
  );
};

type AppFieldContext = {
  SelectField: Component<SelectFieldProps>;
};

type AppFieldComponent = Component<{
  name: 'mcuBoard' | 'thrusterProtocol' | 'dshotSpeed' | 'currentSensingMode';
  children: (field: AppFieldContext) => JSXElement;
}>;

const McuBoardSelectField: Component<{
  AppField: AppFieldComponent;
  boards: SelectCollection;
  onBoardChange: (board: McuFormValues['mcuBoard'][number]) => void;
  onFlashFirmware: () => void;
}> = (props) => (
  <props.AppField name='mcuBoard'>
    {(field: AppFieldContext): JSXElement => (
      <field.SelectField
        label={m.general_rov_settings_mcu_board_title()}
        description={m.general_rov_settings_mcu_board_description()}
        collection={props.boards}
        placeholder={m.general_rov_settings_mcu_board_select_placeholder()}
        onValueChange={(details): void => {
          const [board] = details.value;
          if (board === McuBoard.pico || board === McuBoard.pico2) {
            props.onBoardChange(board);
          }
        }}
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

const ThrusterProtocolSelectField: Component<{
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

const DshotSpeedSelectField: Component<{
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

const CurrentSensingModeSelectField: Component<{
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
  const currentSensingModes = createCurrentSensingModes();
  const form = useAppForm(() => ({
    validators: { onChange: formSchema, onSubmit: formSchema },
    defaultValues: getDefaultFormValues(),
    onSubmit: ({ value }: { value: McuFormValues }): Promise<void> => submitMcuConfig(value),
  }));
  const selectedMcuBoard = form.useSelector(
    (state) => state.values.mcuBoard[0] ?? rovConfigStore.mcuBoard,
  );
  const dshotSpeeds = createMemo(() => createDshotSpeeds(selectedMcuBoard()));
  const handleMcuBoardChange = (board: McuFormValues['mcuBoard'][number]): void => {
    const currentSpeed = form.getFieldValue('dshotSpeed')[0] ?? '300';
    const compatibleSpeed = getCompatibleDshotSpeed(board, currentSpeed);
    if (compatibleSpeed !== currentSpeed) {
      form.setFieldValue('dshotSpeed', [compatibleSpeed]);
    }
    form.setFieldValue('mcuBoard', [board]);
  };

  return (
    <form.AppForm>
      <form.Form>
        <McuBoardSelectField
          AppField={form.AppField}
          boards={boards}
          onBoardChange={handleMcuBoardChange}
          onFlashFirmware={handleFlashFirmware}
        />
        <ThrusterProtocolSelectField AppField={form.AppField} protocols={protocols} />
        <DshotSpeedSelectField
          AppField={form.AppField}
          speeds={dshotSpeeds()}
          disabled={rovConfigStore.thrusterProtocol !== ThrusterProtocol.dshot}
        />
        <CurrentSensingModeSelectField AppField={form.AppField} modes={currentSensingModes} />
        <form.AutoSubmit debounce={500} />
      </form.Form>
    </form.AppForm>
  );
};

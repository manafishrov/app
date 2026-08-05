import { type SelectFieldProps, useAppForm } from '@manafishrov/ui/form';
import { SelectItem } from '@manafishrov/ui/select';
import { createMemo, createSignal, type Component, type JSXElement } from 'solid-js';

import { McuFirmwareVersionCard } from '@/features/settings/forms/McuFirmwareVersionCard';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { McuBoard, ThrusterProtocol, rovConfigStore } from '@/stores/rovConfig';
import { flashMcuFirmware, setRovConfig } from '@/tauri';

import {
  createCurrentSensingModes,
  createDshotSpeeds,
  createMcuBoards,
  createThrusterProtocols,
  type SelectCollection,
  type SelectOption,
} from './mcu/options';
import { PowerCycleWarningDialog } from './mcu/PowerCycleWarningDialog';
import {
  createMcuBoardChangeHandler,
  formSchema,
  getDshotSpeedFormValue,
  parseDshotSpeed,
  type McuFormValues,
} from './mcu/schema';
import { updateMcuConfig, type ResolvedMcuConfig } from './mcu/update';

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

const flashSelectedMcuFirmware = (board: ResolvedMcuConfig['mcuBoard']): void => {
  flashMcuFirmware(board).catch((error: unknown): void => {
    logError('Failed to flash MCU firmware:', error);
  });
};

const submitMcuConfig = (value: McuFormValues): Promise<void> => {
  const resolved = resolveFormValues(value);
  const previousBoard = rovConfigStore.mcuBoard;

  return updateMcuConfig(
    { config: resolved, previousBoard },
    { setConfig: setRovConfig, flashFirmware: flashMcuFirmwareWithLogging },
  );
};

const createMcuSubmitHandler =
  (onSignalSettingsChanged: () => void) =>
  ({ value }: { value: McuFormValues }): Promise<void> => {
    const nextProtocol = value.thrusterProtocol[0] ?? rovConfigStore.thrusterProtocol;
    const signalSettingsChanged =
      nextProtocol !== rovConfigStore.thrusterProtocol ||
      (nextProtocol === ThrusterProtocol.dshot &&
        parseDshotSpeed(value.dshotSpeed[0], rovConfigStore.dshotSpeed) !==
          rovConfigStore.dshotSpeed);
    return submitMcuConfig(value).then(() => {
      if (signalSettingsChanged) {
        onSignalSettingsChanged();
      }
    });
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
}> = (props) => (
  <props.AppField name='mcuBoard'>
    {(field: AppFieldContext): JSXElement => (
      <field.SelectField
        aria-label={m.general_rov_settings_mcu_board_title()}
        collection={props.boards}
        placeholder={m.general_rov_settings_mcu_board_select_placeholder()}
        onValueChange={(details): void => {
          const [board] = details.value;
          if (board === McuBoard.pico || board === McuBoard.pico2) {
            props.onBoardChange(board);
          }
        }}
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

const McuFields: Component<{
  AppField: AppFieldComponent;
  boards: SelectCollection;
  protocols: SelectCollection;
  speeds: SelectCollection;
  modes: SelectCollection;
  dshotDisabled: boolean;
  onBoardChange: (board: McuFormValues['mcuBoard'][number]) => void;
  onFlashFirmware: () => void;
  afterFirmwareCard?: JSXElement;
}> = (props) => (
  <>
    <McuFirmwareVersionCard
      boardField={
        <McuBoardSelectField
          AppField={props.AppField}
          boards={props.boards}
          onBoardChange={props.onBoardChange}
        />
      }
      onFlashFirmware={props.onFlashFirmware}
    />
    {props.afterFirmwareCard}
    <ThrusterProtocolSelectField AppField={props.AppField} protocols={props.protocols} />
    <DshotSpeedSelectField
      AppField={props.AppField}
      speeds={props.speeds}
      disabled={props.dshotDisabled}
    />
    <CurrentSensingModeSelectField AppField={props.AppField} modes={props.modes} />
  </>
);

export const Mcu: Component<{ afterFirmwareCard?: JSXElement }> = (props) => {
  const [showPowerCycleWarning, setShowPowerCycleWarning] = createSignal(false);
  const boards = createMcuBoards();
  const protocols = createThrusterProtocols();
  const form = useAppForm(() => ({
    validators: { onChange: formSchema, onSubmit: formSchema },
    defaultValues: getDefaultFormValues(),
    onSubmit: createMcuSubmitHandler(() => setShowPowerCycleWarning(true)),
  }));
  const selectedMcuBoard = form.useSelector(
    (state) => state.values.mcuBoard[0] ?? rovConfigStore.mcuBoard,
  );
  const dshotSpeeds = createMemo(() => createDshotSpeeds(selectedMcuBoard()));
  const selectedThrusterProtocol = form.useSelector(
    (state) => state.values.thrusterProtocol[0] ?? rovConfigStore.thrusterProtocol,
  );
  const handleMcuBoardChange = createMcuBoardChangeHandler(
    () => form.getFieldValue('dshotSpeed')[0] ?? '300',
    (speed) => {
      form.setFieldValue('dshotSpeed', [speed]);
    },
    (board) => {
      form.setFieldValue('mcuBoard', [board]);
    },
  );
  return (
    <form.AppForm>
      <form.Form>
        <McuFields
          AppField={form.AppField}
          boards={boards}
          protocols={protocols}
          speeds={dshotSpeeds()}
          modes={createCurrentSensingModes()}
          dshotDisabled={selectedThrusterProtocol() !== ThrusterProtocol.dshot}
          onBoardChange={handleMcuBoardChange}
          onFlashFirmware={() => {
            flashSelectedMcuFirmware(selectedMcuBoard());
          }}
          afterFirmwareCard={props.afterFirmwareCard}
        />
        <form.AutoSubmit debounce={500} />
      </form.Form>
      <PowerCycleWarningDialog
        open={showPowerCycleWarning()}
        onClose={() => setShowPowerCycleWarning(false)}
      />
    </form.AppForm>
  );
};

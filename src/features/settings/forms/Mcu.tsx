import { type SelectFieldProps, useAppForm } from '@manafishrov/ui/form';
import { SelectItem } from '@manafishrov/ui/select';
import { createMemo, createSignal, type Component, type JSXElement } from 'solid-js';

import { McuFirmwareVersionCard } from '@/features/settings/forms/McuFirmwareVersionCard';
import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { McuBoard, ThrusterProtocol, rovConfigStore } from '@/stores/rovConfig';
import { isEscFirmwareUpdatePending, rovStatusStore } from '@/stores/rovStatus';
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
  formSchema,
  getCompatibleDshotSpeed,
  getDshotSpeedFormValue,
  parseDshotSpeed,
  type McuFormValues,
} from './mcu/schema';
import { updateMcuConfig, type ResolvedMcuConfig } from './mcu/update';
import { mcuConfigMatches } from './mcu/verify';

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

const setMcuConfigAndVerify = (config: ResolvedMcuConfig): Promise<void> =>
  setRovConfig(config).then(() => {
    if (!mcuConfigMatches(config, rovConfigStore)) {
      throw new Error('The ROV rejected the MCU configuration');
    }
  });

const submitMcuConfig = (value: McuFormValues): Promise<void> => {
  const resolved = resolveFormValues(value);
  const previousBoard = rovConfigStore.mcuBoard;

  return updateMcuConfig(
    { config: resolved, previousBoard },
    { setConfig: setMcuConfigAndVerify, flashFirmware: flashMcuFirmwareWithLogging },
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
  disabled?: boolean;
}> = (props) => (
  <props.AppField name='mcuBoard'>
    {(field: AppFieldContext): JSXElement => (
      <field.SelectField
        aria-label={m.general_rov_settings_mcu_board_title()}
        collection={props.boards}
        placeholder={m.general_rov_settings_mcu_board_select_placeholder()}
        disabled={props.disabled}
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
  disabled?: boolean;
}> = (props) => (
  <props.AppField name='thrusterProtocol'>
    {(field: AppFieldContext): JSXElement => (
      <field.SelectField
        label={m.general_rov_settings_thruster_protocol_title()}
        description={m.general_rov_settings_thruster_protocol_description()}
        collection={props.protocols}
        placeholder={m.general_rov_settings_thruster_protocol_select_placeholder()}
        disabled={props.disabled}
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
  protocols: SelectCollection;
  speeds: SelectCollection;
  modes: SelectCollection;
  dshotDisabled: boolean;
  disruptiveSettingsDisabled: boolean;
}> = (props) => (
  <>
    <ThrusterProtocolSelectField
      AppField={props.AppField}
      protocols={props.protocols}
      disabled={props.disruptiveSettingsDisabled}
    />
    <DshotSpeedSelectField
      AppField={props.AppField}
      speeds={props.speeds}
      disabled={props.dshotDisabled || props.disruptiveSettingsDisabled}
    />
    <CurrentSensingModeSelectField AppField={props.AppField} modes={props.modes} />
  </>
);

export const Mcu: Component = () => {
  const [showPowerCycleWarning, setShowPowerCycleWarning] = createSignal(false);
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
  return (
    <form.AppForm>
      <form.Form>
        <McuFields
          AppField={form.AppField}
          protocols={protocols}
          speeds={dshotSpeeds()}
          modes={createCurrentSensingModes()}
          dshotDisabled={selectedThrusterProtocol() !== ThrusterProtocol.dshot}
          disruptiveSettingsDisabled={isEscFirmwareUpdatePending(rovStatusStore.escFirmwareUpdate)}
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

const flashSelectedBoard = (board: ResolvedMcuConfig['mcuBoard']): Promise<void> => {
  const compatibleSpeed = parseDshotSpeed(
    getCompatibleDshotSpeed(board, getDshotSpeedFormValue(rovConfigStore.dshotSpeed)),
    rovConfigStore.dshotSpeed,
  );
  const configChanged =
    board !== rovConfigStore.mcuBoard || compatibleSpeed !== rovConfigStore.dshotSpeed;
  const saveTarget = configChanged
    ? setRovConfig({ mcuBoard: board, dshotSpeed: compatibleSpeed }).catch(
        (error: unknown): never => {
          logError('Failed to save MCU board before flashing:', error);
          throw error;
        },
      )
    : Promise.resolve();
  return saveTarget.then(() => {
    if (rovConfigStore.mcuBoard !== board || rovConfigStore.dshotSpeed !== compatibleSpeed) {
      throw new Error('The ROV rejected the MCU firmware target');
    }
    return flashMcuFirmwareWithLogging(board);
  });
};

export const McuFirmware: Component = () => {
  const boards = createMcuBoards();
  const form = useAppForm(() => ({
    validators: { onChange: formSchema },
    defaultValues: getDefaultFormValues(),
  }));
  const selectedMcuBoard = form.useSelector(
    (state) => state.values.mcuBoard[0] ?? rovConfigStore.mcuBoard,
  );
  const handleMcuBoardChange = (board: McuFormValues['mcuBoard'][number]): void => {
    form.setFieldValue('mcuBoard', [board]);
  };

  return (
    <form.AppForm>
      <form.Form>
        <McuFirmwareVersionCard
          boardField={
            <McuBoardSelectField
              AppField={form.AppField}
              boards={boards}
              onBoardChange={handleMcuBoardChange}
              disabled={isEscFirmwareUpdatePending(rovStatusStore.escFirmwareUpdate)}
            />
          }
          onFlashFirmware={() => flashSelectedBoard(selectedMcuBoard())}
          disabled={isEscFirmwareUpdatePending(rovStatusStore.escFirmwareUpdate)}
        />
      </form.Form>
    </form.AppForm>
  );
};

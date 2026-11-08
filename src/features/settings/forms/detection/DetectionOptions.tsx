import { createListCollection } from '@ark-ui/solid/collection';
import {
  type SelectFieldProps,
  type SliderFieldProps,
  type SwitchFieldProps,
  useAppForm,
} from '@manafishrov/ui/form';
import { SelectItem } from '@manafishrov/ui/select';
import { createResource, type Component, type JSXElement } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { z } from 'zod';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { configStore, ExecutionProviderPreference } from '@/stores/config';
import { detectionStore } from '@/stores/detection';
import { setConfig } from '@/tauri/config';
import { listDetectionExecutionProviders } from '@/tauri/detection';

type SelectOption = { value: string; label: string };
type SelectCollection = ReturnType<typeof createListCollection<SelectOption>>;

const PERCENT = 100;
const MIN_CONFIDENCE_PERCENT = 5;
const MAX_CONFIDENCE_PERCENT = 95;
const CONFIDENCE_STEP_PERCENT = 5;
const LOW_MARK_PERCENT = 25;
const MIDDLE_MARK_PERCENT = 50;
const HIGH_MARK_PERCENT = 75;
const confidenceMarks = [LOW_MARK_PERCENT, MIDDLE_MARK_PERCENT, HIGH_MARK_PERCENT].map((value) => ({
  value,
  label: `${String(value)}%`,
}));

const formSchema = z.object({
  enabled: z.boolean(),
  modelId: z.array(z.string()).max(1),
  confidencePercent: z
    .array(z.number().min(MIN_CONFIDENCE_PERCENT).max(MAX_CONFIDENCE_PERCENT))
    .length(1),
  executionProvider: z
    .array(
      z.enum([
        ExecutionProviderPreference.auto,
        ExecutionProviderPreference.gpu,
        ExecutionProviderPreference.cpu,
        ExecutionProviderPreference.cuda,
        ExecutionProviderPreference.migraphx,
        ExecutionProviderPreference.openVino,
      ]),
    )
    .length(1),
  showLabels: z.boolean(),
  showTrackIds: z.boolean(),
});

type DetectionFormValues = z.infer<typeof formSchema>;

const getDefaultFormValues = (providers: ExecutionProviderPreference[]): DetectionFormValues => {
  const { detection } = configStore;
  return {
    enabled: detection.enabled,
    modelId: detection.modelId === null ? [] : [detection.modelId],
    confidencePercent: [Math.round(detection.confidenceThreshold * PERCENT)],
    executionProvider: [
      providers.includes(detection.executionProvider)
        ? detection.executionProvider
        : ExecutionProviderPreference.auto,
    ],
    showLabels: detection.showLabels,
    showTrackIds: detection.showTrackIds,
  };
};

const submitDetectionOptions = (value: DetectionFormValues): Promise<void> => {
  const current = structuredClone(unwrap(configStore.detection));
  const confidencePercent = value.confidencePercent[0] ?? current.confidenceThreshold * PERCENT;
  return setConfig({
    detection: {
      ...current,
      enabled: value.enabled,
      modelId: value.modelId[0] ?? null,
      confidenceThreshold: confidencePercent / PERCENT,
      executionProvider: value.executionProvider[0] ?? current.executionProvider,
      showLabels: value.showLabels,
      showTrackIds: value.showTrackIds,
    },
  });
};

const acceleratorLabel = (): string => {
  if (import.meta.env['TAURI_ENV_PLATFORM'] === 'android') {
    return m.detection_hardware_nnapi();
  }
  if (import.meta.env['TAURI_ENV_PLATFORM'] === 'ios') {
    return m.detection_hardware_coreml();
  }
  return m.detection_hardware_gpu();
};

const createExecutionProviders = (providers: ExecutionProviderPreference[]): SelectCollection => {
  const labels = {
    auto: m.detection_hardware_auto(),
    gpu: acceleratorLabel(),
    cpu: m.detection_hardware_cpu(),
    cuda: 'NVIDIA CUDA',
    migraphx: 'AMD MIGraphX (ROCm)',
    openVino: 'Intel GPU (OpenVINO)',
  };
  return createListCollection<SelectOption>({
    items: providers.map((value) => ({ value, label: labels[value] })),
  });
};

const createModelOptions = (): SelectCollection =>
  createListCollection<SelectOption>({
    items: detectionStore.models.map((model) => ({ value: model.id, label: model.name })),
  });

type AppFieldContext = {
  SelectField: Component<SelectFieldProps>;
  SliderField: Component<SliderFieldProps>;
  SwitchField: Component<SwitchFieldProps>;
};

type AppFieldComponent = Component<{
  name: keyof DetectionFormValues;
  children: (field: AppFieldContext) => JSXElement;
}>;

const SelectOptions: Component<{ collection: SelectCollection }> = (props) => (
  <For each={props.collection.items}>
    {(item: SelectOption): JSXElement => <SelectItem item={item}>{item.label}</SelectItem>}
  </For>
);

const ModelFields: Component<{ AppField: AppFieldComponent; models: SelectCollection }> = (
  props,
) => (
  <>
    <props.AppField name='enabled'>
      {(field: AppFieldContext): JSXElement => (
        <field.SwitchField
          label={m.detection_enabled_title()}
          description={m.detection_enabled_description()}
        />
      )}
    </props.AppField>
    <props.AppField name='modelId'>
      {(field: AppFieldContext): JSXElement => (
        <field.SelectField
          label={m.detection_model_title()}
          description={m.detection_model_description()}
          collection={props.models}
          placeholder={
            props.models.items.length === 0
              ? m.detection_model_none_imported()
              : m.detection_model_placeholder()
          }
        >
          <SelectOptions collection={props.models} />
        </field.SelectField>
      )}
    </props.AppField>
  </>
);

const TuningFields: Component<{
  AppField: AppFieldComponent;
  executionProviders: SelectCollection;
}> = (props) => (
  <>
    <props.AppField name='confidencePercent'>
      {(field: AppFieldContext): JSXElement => (
        <field.SliderField
          label={m.detection_confidence_title()}
          description={m.detection_confidence_description()}
          min={MIN_CONFIDENCE_PERCENT}
          max={MAX_CONFIDENCE_PERCENT}
          step={CONFIDENCE_STEP_PERCENT}
          marks={confidenceMarks}
        />
      )}
    </props.AppField>
    <props.AppField name='executionProvider'>
      {(field: AppFieldContext): JSXElement => (
        <field.SelectField
          label={m.detection_hardware_title()}
          description={m.detection_hardware_description()}
          collection={props.executionProviders}
          placeholder={m.detection_hardware_title()}
        >
          <SelectOptions collection={props.executionProviders} />
        </field.SelectField>
      )}
    </props.AppField>
  </>
);

const DisplayFields: Component<{ AppField: AppFieldComponent }> = (props) => (
  <>
    <props.AppField name='showLabels'>
      {(field: AppFieldContext): JSXElement => (
        <field.SwitchField
          label={m.detection_show_labels_title()}
          description={m.detection_show_labels_description()}
        />
      )}
    </props.AppField>
    <props.AppField name='showTrackIds'>
      {(field: AppFieldContext): JSXElement => (
        <field.SwitchField
          label={m.detection_show_track_ids_title()}
          description={m.detection_show_track_ids_description()}
        />
      )}
    </props.AppField>
  </>
);

const DetectionOptionsForm: Component<{ providers: ExecutionProviderPreference[] }> = (props) => {
  const models = createModelOptions();
  const executionProviders = createExecutionProviders(props.providers);
  const form = useAppForm(() => ({
    validators: { onChange: formSchema, onSubmit: formSchema },
    defaultValues: getDefaultFormValues(props.providers),
    onSubmit: ({ value }: { value: DetectionFormValues }): Promise<void> =>
      submitDetectionOptions(value).catch(logError),
  }));

  return (
    <form.AppForm>
      <form.Form>
        <ModelFields AppField={form.AppField} models={models} />
        <TuningFields AppField={form.AppField} executionProviders={executionProviders} />
        <DisplayFields AppField={form.AppField} />
        <form.AutoSubmit debounce={300} />
      </form.Form>
    </form.AppForm>
  );
};

/**
 * The form keeps its own values, so it is rebuilt from the config whenever the
 * model list or the active model changes outside it (import, delete, toggle).
 */
const formKey = (): string =>
  [
    configStore.detection.modelId ?? '',
    String(configStore.detection.enabled),
    ...detectionStore.models.map((model) => model.id),
  ].join(':');

export const DetectionOptions: Component = () => {
  const [providers] = createResource(() =>
    listDetectionExecutionProviders().catch((error: unknown) => {
      logError('Failed to load detection backends:', error);
      return [ExecutionProviderPreference.auto, ExecutionProviderPreference.cpu];
    }),
  );
  return (
    <Show when={providers()}>
      {(available): JSXElement => (
        <Show when={formKey()} keyed>
          <DetectionOptionsForm providers={available()} />
        </Show>
      )}
    </Show>
  );
};

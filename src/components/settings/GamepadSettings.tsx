import { createListCollection } from '@ark-ui/solid/collection';
import { Select } from '@manafishrov/ui/select';
import {
  SelectContent,
  SelectControl,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@manafishrov/ui/select';
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Component,
} from 'solid-js';
import SportsEsportsIcon from '~icons/material-symbols/sports-esports';

import { GamepadBindInput } from '@/components/settings/GamepadBindInput';
import { getConnectedGamepads } from '@/input';
import {
  type GamepadBindings,
  type GamepadInput,
  createNullGamepadBindings,
  configStore,
  setConfig,
} from '@/stores/config';

type SelectItemOption = {
  value: string;
  label: string;
};

type BindingField = {
  key: keyof GamepadBindings;
  label: string;
};

type BindingSection = {
  title: string;
  fields: BindingField[];
  className?: string;
};

const BINDING_SECTIONS: BindingSection[] = [
  {
    title: 'Surge',
    fields: [
      { key: 'surgeForward', label: 'Surge forward' },
      { key: 'surgeBackward', label: 'Surge backward' },
    ],
  },
  {
    title: 'Sway',
    fields: [
      { key: 'swayRight', label: 'Sway right' },
      { key: 'swayLeft', label: 'Sway left' },
    ],
  },
  {
    title: 'Heave',
    fields: [
      { key: 'heaveUp', label: 'Heave up' },
      { key: 'heaveDown', label: 'Heave down' },
    ],
  },
  {
    title: 'Pitch',
    fields: [
      { key: 'pitchUp', label: 'Pitch up' },
      { key: 'pitchDown', label: 'Pitch down' },
    ],
  },
  {
    title: 'Yaw',
    fields: [
      { key: 'yawRight', label: 'Yaw right' },
      { key: 'yawLeft', label: 'Yaw left' },
    ],
  },
  {
    title: 'Roll',
    fields: [
      { key: 'rollRight', label: 'Roll right' },
      { key: 'rollLeft', label: 'Roll left' },
    ],
  },
  {
    title: 'Actions',
    className: 'sm:row-span-2',
    fields: [
      { key: 'action1Positive', label: 'Action 1 positive' },
      { key: 'action1Negative', label: 'Action 1 negative' },
      { key: 'action2Positive', label: 'Action 2 positive' },
      { key: 'action2Negative', label: 'Action 2 negative' },
    ],
  },
  {
    title: 'Stabilisation',
    fields: [
      { key: 'autoStabilization', label: 'Auto stabilization' },
      { key: 'depthHold', label: 'Depth hold' },
    ],
  },
  {
    title: 'Other',
    fields: [{ key: 'record', label: 'Record' }],
  },
];

const SettingsGrid: Component<{
  selectedGamepadId: string | null;
  bindings: GamepadBindings;
  resetBindings: GamepadBindings;
  onBindChange: (bindingKey: keyof GamepadBindings, next: GamepadInput | null) => void;
}> = (props) => {
  return (
    <div class='grid grid-cols-1 gap-6 sm:grid-cols-2 sm:auto-rows-min'>
      <For each={BINDING_SECTIONS}>
        {(section) => (
          <div class={`space-y-2 ${section.className ?? ''}`.trim()}>
            <h3 class='text-2xl font-semibold tracking-tight'>{section.title}</h3>
            <For each={section.fields}>
              {(field) => (
                <GamepadBindInput
                  label={field.label}
                  value={props.bindings[field.key]}
                  resetValue={props.resetBindings[field.key]}
                  selectedGamepadId={props.selectedGamepadId}
                  onChange={(next) => props.onBindChange(field.key, next)}
                />
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
};

const uniqueByGamepadId = (gamepads: Gamepad[]): SelectItemOption[] => {
  const seenIds = new Set<string>();
  const options: SelectItemOption[] = [];

  for (const gamepad of gamepads) {
    if (seenIds.has(gamepad.id)) continue;
    seenIds.add(gamepad.id);
    options.push({
      value: gamepad.id,
      label: gamepad.id,
    });
  }

  return options;
};

const cloneGamepadBindings = (bindings: GamepadBindings): GamepadBindings => {
  return {
    surgeForward: bindings.surgeForward
      ? { ...bindings.surgeForward, input: { ...bindings.surgeForward.input } }
      : null,
    surgeBackward: bindings.surgeBackward
      ? { ...bindings.surgeBackward, input: { ...bindings.surgeBackward.input } }
      : null,
    swayRight: bindings.swayRight
      ? { ...bindings.swayRight, input: { ...bindings.swayRight.input } }
      : null,
    swayLeft: bindings.swayLeft
      ? { ...bindings.swayLeft, input: { ...bindings.swayLeft.input } }
      : null,
    heaveUp: bindings.heaveUp
      ? { ...bindings.heaveUp, input: { ...bindings.heaveUp.input } }
      : null,
    heaveDown: bindings.heaveDown
      ? { ...bindings.heaveDown, input: { ...bindings.heaveDown.input } }
      : null,
    pitchUp: bindings.pitchUp
      ? { ...bindings.pitchUp, input: { ...bindings.pitchUp.input } }
      : null,
    pitchDown: bindings.pitchDown
      ? { ...bindings.pitchDown, input: { ...bindings.pitchDown.input } }
      : null,
    yawRight: bindings.yawRight
      ? { ...bindings.yawRight, input: { ...bindings.yawRight.input } }
      : null,
    yawLeft: bindings.yawLeft
      ? { ...bindings.yawLeft, input: { ...bindings.yawLeft.input } }
      : null,
    rollLeft: bindings.rollLeft
      ? { ...bindings.rollLeft, input: { ...bindings.rollLeft.input } }
      : null,
    rollRight: bindings.rollRight
      ? { ...bindings.rollRight, input: { ...bindings.rollRight.input } }
      : null,
    action1Positive: bindings.action1Positive
      ? { ...bindings.action1Positive, input: { ...bindings.action1Positive.input } }
      : null,
    action1Negative: bindings.action1Negative
      ? { ...bindings.action1Negative, input: { ...bindings.action1Negative.input } }
      : null,
    action2Positive: bindings.action2Positive
      ? { ...bindings.action2Positive, input: { ...bindings.action2Positive.input } }
      : null,
    action2Negative: bindings.action2Negative
      ? { ...bindings.action2Negative, input: { ...bindings.action2Negative.input } }
      : null,
    autoStabilization: bindings.autoStabilization
      ? { ...bindings.autoStabilization, input: { ...bindings.autoStabilization.input } }
      : null,
    depthHold: bindings.depthHold
      ? { ...bindings.depthHold, input: { ...bindings.depthHold.input } }
      : null,
    record: bindings.record ? { ...bindings.record, input: { ...bindings.record.input } } : null,
  };
};

const cloneGamepadMap = (map: Record<string, GamepadBindings>): Record<string, GamepadBindings> => {
  const entries = Object.entries(map).map(([id, bindings]) => [id, cloneGamepadBindings(bindings)]);
  return Object.fromEntries(entries);
};

const GamepadSettings: Component = () => {
  const [connectedGamepads, setConnectedGamepads] = createSignal<Gamepad[]>([]);
  const [initialGamepadBindings] = createSignal<Record<string, GamepadBindings>>(
    cloneGamepadMap(configStore.gamepad),
  );
  let pollInterval: number | undefined;

  onMount(() => {
    const updateConnectedGamepads = (): void => {
      setConnectedGamepads(getConnectedGamepads());
    };

    const onGamepadChange = (): void => {
      updateConnectedGamepads();
    };

    updateConnectedGamepads();
    window.addEventListener('gamepadconnected', onGamepadChange);
    window.addEventListener('gamepaddisconnected', onGamepadChange);
    pollInterval = window.setInterval(updateConnectedGamepads, 500);

    onCleanup(() => {
      window.removeEventListener('gamepadconnected', onGamepadChange);
      window.removeEventListener('gamepaddisconnected', onGamepadChange);
    });
  });

  onCleanup(() => {
    if (pollInterval !== undefined) {
      window.clearInterval(pollInterval);
    }
  });

  const selectedGamepadId = (): string | null => configStore.selectedGamepadId;

  const gamepadOptions = createMemo(() => {
    return uniqueByGamepadId(connectedGamepads());
  });

  const gamepadCollection = createMemo(() => {
    return createListCollection<SelectItemOption>({
      items: gamepadOptions(),
    });
  });

  const selectedBindings = createMemo<GamepadBindings | null>(() => {
    const selectedId = selectedGamepadId();
    if (!selectedId) return null;
    return configStore.gamepad[selectedId] ?? createNullGamepadBindings();
  });

  const selectedResetBindings = createMemo<GamepadBindings | null>(() => {
    const selectedId = selectedGamepadId();
    if (!selectedId) return null;
    return initialGamepadBindings()[selectedId] ?? createNullGamepadBindings();
  });

  const selectedGamepadValue = createMemo<string[]>(() => {
    const selectedId = selectedGamepadId();
    return selectedId ? [selectedId] : [];
  });

  const setSelectedGamepad = async (gamepadId: string) => {
    const nextGamepadBindings = configStore.gamepad[gamepadId]
      ? configStore.gamepad
      : {
          ...configStore.gamepad,
          [gamepadId]: createNullGamepadBindings(),
        };

    await setConfig({
      selectedGamepadId: gamepadId,
      gamepad: nextGamepadBindings,
    });
  };

  const updateGamepadBinding = async (
    bindingKey: keyof GamepadBindings,
    value: GamepadInput | null,
  ) => {
    const selectedId = selectedGamepadId();
    if (!selectedId) return;

    const currentBindings = configStore.gamepad[selectedId] ?? createNullGamepadBindings();
    const updatedBindings: GamepadBindings = {
      ...currentBindings,
      [bindingKey]: value,
    };

    await setConfig({
      gamepad: {
        ...configStore.gamepad,
        [selectedId]: updatedBindings,
      },
    });
  };

  const selectedGamepadConnected = createMemo(() => {
    const selectedId = selectedGamepadId();
    if (!selectedId) return false;
    return connectedGamepads().some((gamepad) => gamepad.id === selectedId);
  });

  createEffect(() => {
    const options = gamepadOptions();
    if (options.length === 0) return;

    const selectedId = selectedGamepadId();
    const selectedAvailable = Boolean(
      selectedId && options.some((option) => option.value === selectedId),
    );

    if (!selectedAvailable) {
      const fallbackId = options[0]?.value;
      if (fallbackId) {
        void setSelectedGamepad(fallbackId);
      }
    }
  });

  return (
    <div class='space-y-6'>
      <Show
        when={connectedGamepads().length > 0}
        fallback={
          <div class='flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center'>
            <SportsEsportsIcon class='size-12 text-muted-foreground' />
            <h3 class='mt-4 text-lg font-semibold text-muted-foreground'>No gamepad connected</h3>
            <p class='mt-2 text-sm text-muted-foreground'>
              Connect a gamepad to configure bindings.
            </p>
          </div>
        }
      >
        <div class='space-y-2'>
          <Select<SelectItemOption>
            collection={gamepadCollection()}
            value={selectedGamepadValue()}
            onValueChange={(details) => {
              const gamepadId = details.value[0];
              if (!gamepadId) return;
              void setSelectedGamepad(gamepadId);
            }}
          >
            <SelectLabel>Gamepad</SelectLabel>
            <SelectControl>
              <SelectTrigger>
                <SelectValue placeholder='Select a gamepad' />
                <SelectIndicator />
              </SelectTrigger>
            </SelectControl>
            <SelectPositioner>
              <SelectContent>
                <For each={gamepadOptions()}>
                  {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
                </For>
              </SelectContent>
            </SelectPositioner>
          </Select>
        </div>

        <Show
          when={selectedBindings()}
          fallback={<p class='text-sm text-muted-foreground'>Select a gamepad to edit bindings.</p>}
        >
          {(bindings) => (
            <Show when={selectedResetBindings()} fallback={null}>
              {(resetBindings) => (
                <Show
                  when={selectedGamepadConnected()}
                  fallback={
                    <p class='text-sm text-muted-foreground'>
                      The selected gamepad is not connected. Reconnect it to capture input.
                    </p>
                  }
                >
                  <SettingsGrid
                    selectedGamepadId={selectedGamepadId()}
                    bindings={bindings()}
                    resetBindings={resetBindings()}
                    onBindChange={updateGamepadBinding}
                  />
                </Show>
              )}
            </Show>
          )}
        </Show>
      </Show>
    </div>
  );
};

export { GamepadSettings };

import { createListCollection } from '@ark-ui/solid/collection';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@manafishrov/ui/empty';
import { Select } from '@manafishrov/ui/select';
import {
  SelectContent,
  SelectControl,
  SelectClearTrigger,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@manafishrov/ui/select';
import { H3 } from '@manafishrov/ui/typography';
import { type Component } from 'solid-js';
import SportsEsportsIcon from '~icons/material-symbols/sports-esports';

import { GamepadBindInput } from '@/components/settings/input/GamepadBindInput';
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
}> = (props) => (
  <div class='grid grid-cols-1 gap-6 sm:grid-cols-2 sm:auto-rows-min'>
    <For each={BINDING_SECTIONS}>
      {(section) => (
        <div class={`space-y-2 ${section.className ?? ''}`.trim()}>
          <H3>{section.title}</H3>
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

const toGamepadOptions = (gamepads: Gamepad[]): SelectItemOption[] => {
  const totalsById = new Map<string, number>();
  const seenById = new Map<string, number>();

  for (const gamepad of gamepads) {
    totalsById.set(gamepad.id, (totalsById.get(gamepad.id) ?? 0) + 1);
  }

  return gamepads.map((gamepad) => {
    const count = (seenById.get(gamepad.id) ?? 0) + 1;
    seenById.set(gamepad.id, count);
    const total = totalsById.get(gamepad.id) ?? 1;

    return {
      value: gamepad.id,
      label: total > 1 ? `${gamepad.id} (#${count})` : gamepad.id,
    };
  });
};

const cloneGamepadBindings = (bindings: GamepadBindings): GamepadBindings => ({
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
  heaveUp: bindings.heaveUp ? { ...bindings.heaveUp, input: { ...bindings.heaveUp.input } } : null,
  heaveDown: bindings.heaveDown
    ? { ...bindings.heaveDown, input: { ...bindings.heaveDown.input } }
    : null,
  pitchUp: bindings.pitchUp ? { ...bindings.pitchUp, input: { ...bindings.pitchUp.input } } : null,
  pitchDown: bindings.pitchDown
    ? { ...bindings.pitchDown, input: { ...bindings.pitchDown.input } }
    : null,
  yawRight: bindings.yawRight
    ? { ...bindings.yawRight, input: { ...bindings.yawRight.input } }
    : null,
  yawLeft: bindings.yawLeft ? { ...bindings.yawLeft, input: { ...bindings.yawLeft.input } } : null,
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
});

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
  let gamepadConnectedHandler: (() => void) | undefined;
  let gamepadDisconnectedHandler: (() => void) | undefined;

  const updateConnectedGamepads = (): void => {
    setConnectedGamepads(getConnectedGamepads());
  };

  onMount(() => {
    gamepadConnectedHandler = () => updateConnectedGamepads();
    gamepadDisconnectedHandler = () => updateConnectedGamepads();

    updateConnectedGamepads();
    window.addEventListener('gamepadconnected', gamepadConnectedHandler);
    window.addEventListener('gamepaddisconnected', gamepadDisconnectedHandler);
    pollInterval = window.setInterval(updateConnectedGamepads, 500);
  });

  onCleanup(() => {
    if (pollInterval !== undefined) {
      window.clearInterval(pollInterval);
    }
    if (gamepadConnectedHandler) {
      window.removeEventListener('gamepadconnected', gamepadConnectedHandler);
    }
    if (gamepadDisconnectedHandler) {
      window.removeEventListener('gamepaddisconnected', gamepadDisconnectedHandler);
    }
  });

  const selectedGamepadId = (): string | null => configStore.selectedGamepadId;

  const gamepadOptions = createMemo(() => toGamepadOptions(connectedGamepads()));

  const gamepadCollection = createMemo(() =>
    createListCollection<SelectItemOption>({
      items: gamepadOptions(),
    }),
  );

  const selectedBindings = createMemo<GamepadBindings | null>(() => {
    const selectedId = selectedGamepadId();
    if (!selectedId) {
      return null;
    }
    return configStore.gamepad[selectedId] ?? createNullGamepadBindings();
  });

  const selectedResetBindings = createMemo<GamepadBindings | null>(() => {
    const selectedId = selectedGamepadId();
    if (!selectedId) {
      return null;
    }
    return initialGamepadBindings()[selectedId] ?? createNullGamepadBindings();
  });

  const selectedGamepadValue = createMemo<string[]>(() => {
    const selectedId = selectedGamepadId();
    return selectedId ? [selectedId] : [];
  });

  const setSelectedGamepad = async (gamepadId: string | null) => {
    if (!gamepadId) {
      await setConfig({ selectedGamepadId: null });
      return;
    }

    const selectedGamepad = connectedGamepads().find((gamepad) => gamepad.id === gamepadId);

    const fallbackLegacyBindings = selectedGamepad
      ? configStore.gamepad[selectedGamepad.id]
      : undefined;

    const nextGamepadBindings = configStore.gamepad[gamepadId]
      ? configStore.gamepad
      : {
          ...configStore.gamepad,
          [gamepadId]: fallbackLegacyBindings ?? createNullGamepadBindings(),
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
    if (!selectedId) {
      return;
    }

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
    if (!selectedId) {
      return false;
    }
    return connectedGamepads().some((gamepad) => gamepad.id === selectedId);
  });

  return (
    <div class='space-y-6'>
      <Show
        when={connectedGamepads().length > 0}
        fallback={
          <Empty>
            <EmptyMedia>
              <SportsEsportsIcon class='size-12 text-muted-foreground' />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No gamepad connected</EmptyTitle>
              <EmptyDescription>Connect a gamepad to configure bindings.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      >
        <div class='space-y-2'>
          <Select<SelectItemOption>
            collection={gamepadCollection()}
            deselectable
            value={selectedGamepadValue()}
            onValueChange={(details) => {
              const gamepadId = details.value[0] ?? null;
              void setSelectedGamepad(gamepadId);
            }}
          >
            <SelectLabel>Gamepad</SelectLabel>
            <SelectControl>
              <SelectTrigger>
                <SelectValue placeholder='Select a gamepad' />
                <Show when={selectedGamepadId()}>
                  <SelectClearTrigger />
                </Show>
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

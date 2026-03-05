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
  configStore,
  createDefaultGamepadBindings,
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
};

const LEFT_COLUMN: BindingSection[] = [
  {
    title: 'Surge & Sway',
    fields: [
      { key: 'surgeForward', label: 'Surge forward' },
      { key: 'swayLeft', label: 'Sway left' },
      { key: 'surgeBackward', label: 'Surge backward' },
      { key: 'swayRight', label: 'Sway right' },
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
    title: 'Stabilization',
    fields: [
      { key: 'autoStabilization', label: 'Auto stabilization' },
      { key: 'depthHold', label: 'Depth hold' },
    ],
  },
];

const RIGHT_COLUMN: BindingSection[] = [
  {
    title: 'Pitch & Yaw',
    fields: [
      { key: 'pitchUp', label: 'Pitch up' },
      { key: 'yawLeft', label: 'Yaw left' },
      { key: 'pitchDown', label: 'Pitch down' },
      { key: 'yawRight', label: 'Yaw right' },
    ],
  },
  {
    title: 'Roll',
    fields: [
      { key: 'rollLeft', label: 'Roll left' },
      { key: 'rollRight', label: 'Roll right' },
    ],
  },
  {
    title: 'Actions',
    fields: [
      { key: 'action1Positive', label: 'Action 1 positive' },
      { key: 'action1Negative', label: 'Action 1 negative' },
      { key: 'action2Positive', label: 'Action 2 positive' },
      { key: 'action2Negative', label: 'Action 2 negative' },
      { key: 'record', label: 'Record' },
    ],
  },
];

const SettingsColumn: Component<{
  sections: BindingSection[];
  selectedGamepadId: string | null;
  bindings: GamepadBindings;
  onBindChange: (bindingKey: keyof GamepadBindings, next: GamepadInput) => void;
}> = (props) => {
  const defaultBindings = createDefaultGamepadBindings();

  return (
    <div class='space-y-6'>
      <For each={props.sections}>
        {(section) => (
          <div class='space-y-2'>
            <h3 class='text-2xl font-semibold tracking-tight'>{section.title}</h3>
            <For each={section.fields}>
              {(field) => (
                <GamepadBindInput
                  label={field.label}
                  value={props.bindings[field.key]}
                  defaultValue={defaultBindings[field.key]}
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

const GamepadSettings: Component = () => {
  const [connectedGamepads, setConnectedGamepads] = createSignal<Gamepad[]>([]);
  let animationFrame: number | undefined;

  onMount(() => {
    const loop = (): void => {
      setConnectedGamepads(getConnectedGamepads());
      animationFrame = window.requestAnimationFrame(loop);
    };

    animationFrame = window.requestAnimationFrame(loop);
  });

  onCleanup(() => {
    if (animationFrame !== undefined) {
      window.cancelAnimationFrame(animationFrame);
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
    return configStore.gamepad[selectedId] ?? createDefaultGamepadBindings();
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
          [gamepadId]: createDefaultGamepadBindings(),
        };

    await setConfig({
      selectedGamepadId: gamepadId,
      gamepad: nextGamepadBindings,
    });
  };

  const updateGamepadBinding = async (bindingKey: keyof GamepadBindings, value: GamepadInput) => {
    const selectedId = selectedGamepadId();
    if (!selectedId) return;

    const currentBindings = configStore.gamepad[selectedId] ?? createDefaultGamepadBindings();
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
          <SelectLabel>Controller</SelectLabel>
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
        <Show
          when={selectedBindings()}
          fallback={<p class='text-sm text-muted-foreground'>Select a gamepad to edit bindings.</p>}
        >
          {(bindings) => (
            <Show
              when={selectedGamepadConnected()}
              fallback={
                <p class='text-sm text-muted-foreground'>
                  The selected gamepad is not connected. Reconnect it to capture input.
                </p>
              }
            >
              <div class='grid grid-cols-1 gap-x-8 sm:grid-cols-2'>
                <SettingsColumn
                  sections={LEFT_COLUMN}
                  selectedGamepadId={selectedGamepadId()}
                  bindings={bindings()}
                  onBindChange={updateGamepadBinding}
                />
                <SettingsColumn
                  sections={RIGHT_COLUMN}
                  selectedGamepadId={selectedGamepadId()}
                  bindings={bindings()}
                  onBindChange={updateGamepadBinding}
                />
              </div>
            </Show>
          )}
        </Show>
      </Show>
    </div>
  );
};

export { GamepadSettings };

import type { Accessor, Component } from 'solid-js';

import { createListCollection } from '@ark-ui/solid/collection';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@manafishrov/ui/empty';
import {
  Select,
  SelectClearTrigger,
  SelectContent,
  SelectControl,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@manafishrov/ui/select';
import SportsEsportsIcon from '~icons/material-symbols/sports-esports';

import { getConnectedGamepads } from '@/input';
import * as m from '@/paraglide/messages';
import {
  type GamepadBindings,
  type GamepadInput,
  createNullGamepadBindings,
  configStore,
  setConfig,
} from '@/stores/config';

import { CustomActionsSettings } from '../CustomActionsSettings';
import {
  NULL_VALUE,
  POLL_INTERVAL_MS,
  getSelectedGamepadIdFromDetails,
  hasSelectedGamepadId,
  ignoreSetConfigResult,
  toGamepadOptions,
  type SelectItemOption,
} from './gamepadSettingsData';
import { SettingsGrid } from './SettingsGrid';

const useConnectedGamepads = (): Accessor<Gamepad[]> => {
  const [connectedGamepads, setConnectedGamepads] = createSignal<Gamepad[]>([]);
  const updateConnectedGamepads = (): void => {
    setConnectedGamepads(getConnectedGamepads());
  };

  let pollInterval: number | null = NULL_VALUE;
  let gamepadConnectedHandler: (() => void) | null = NULL_VALUE;
  let gamepadDisconnectedHandler: (() => void) | null = NULL_VALUE;

  onMount(() => {
    gamepadConnectedHandler = updateConnectedGamepads;
    gamepadDisconnectedHandler = updateConnectedGamepads;

    updateConnectedGamepads();
    globalThis.addEventListener('gamepadconnected', gamepadConnectedHandler);
    globalThis.addEventListener('gamepaddisconnected', gamepadDisconnectedHandler);
    pollInterval = globalThis.setInterval(updateConnectedGamepads, POLL_INTERVAL_MS);
  });

  onCleanup(() => {
    if (pollInterval !== NULL_VALUE) {
      globalThis.clearInterval(pollInterval);
    }
    if (gamepadConnectedHandler) {
      globalThis.removeEventListener('gamepadconnected', gamepadConnectedHandler);
    }
    if (gamepadDisconnectedHandler) {
      globalThis.removeEventListener('gamepaddisconnected', gamepadDisconnectedHandler);
    }
  });

  return connectedGamepads;
};

const useSelectedGamepadId = (): Accessor<string | null> => () => configStore.selectedGamepadId;

const setSelectedGamepad = (
  gamepadId: string | null,
  connectedGamepads: Gamepad[],
): Promise<void> => {
  if (!hasSelectedGamepadId(gamepadId)) {
    return setConfig({ selectedGamepadId: NULL_VALUE });
  }

  const selectedGamepad = connectedGamepads.find((gamepad) => gamepad.id === gamepadId);
  const fallbackLegacyBindings = selectedGamepad
    ? configStore.gamepad[selectedGamepad.id]
    : NULL_VALUE;
  const nextGamepadBindings = configStore.gamepad[gamepadId]
    ? configStore.gamepad
    : {
        ...configStore.gamepad,
        [gamepadId]: fallbackLegacyBindings ?? createNullGamepadBindings(),
      };

  return setConfig({
    selectedGamepadId: gamepadId,
    gamepad: nextGamepadBindings,
  });
};

const updateGamepadBinding = (
  selectedGamepadId: string | null,
  bindingKey: keyof GamepadBindings,
  value: GamepadInput | null,
): Promise<void> => {
  if (!hasSelectedGamepadId(selectedGamepadId)) {
    return Promise.resolve();
  }

  const currentBindings = configStore.gamepad[selectedGamepadId] ?? createNullGamepadBindings();
  const updatedBindings: GamepadBindings = { ...currentBindings, [bindingKey]: value };

  return setConfig({
    gamepad: {
      ...configStore.gamepad,
      [selectedGamepadId]: updatedBindings,
    },
  });
};

const GamepadSelect: Component<{
  gamepadOptions: Accessor<SelectItemOption[]>;
  selectedGamepadValue: Accessor<string[]>;
  selectedGamepadId: Accessor<string | null>;
  onSelect: (gamepadId: string | null) => void;
}> = (props) => (
  <div class='space-y-2'>
    <Select<SelectItemOption>
      collection={createListCollection<SelectItemOption>({ items: props.gamepadOptions() })}
      deselectable
      value={props.selectedGamepadValue()}
      onValueChange={(details: unknown): void => {
        props.onSelect(getSelectedGamepadIdFromDetails(details));
      }}
    >
      <SelectLabel>{m.gamepad_select_label()}</SelectLabel>
      <SelectControl>
        <SelectTrigger>
          <SelectValue placeholder={m.gamepad_select_placeholder()} />
          <Show when={props.selectedGamepadId()}>
            <SelectClearTrigger />
          </Show>
          <SelectIndicator />
        </SelectTrigger>
      </SelectControl>
      <SelectPositioner>
        <SelectContent>
          <For each={props.gamepadOptions()}>
            {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
          </For>
        </SelectContent>
      </SelectPositioner>
    </Select>
  </div>
);

const GamepadBindingsEditor: Component<{
  selectedGamepadId: Accessor<string | null>;
  selectedBindings: Accessor<GamepadBindings | null>;
  selectedGamepadConnected: Accessor<boolean>;
  onBindChange: (bindingKey: keyof GamepadBindings, value: GamepadInput | null) => void;
}> = (props) => (
  <Show
    when={props.selectedBindings()}
    fallback={<p class='text-sm text-muted-foreground'>{m.gamepad_select_to_edit_bindings()}</p>}
  >
    {(bindings) => (
      <Show
        when={props.selectedGamepadConnected()}
        fallback={<p class='text-sm text-muted-foreground'>{m.gamepad_selected_not_connected()}</p>}
      >
        <SettingsGrid
          selectedGamepadId={props.selectedGamepadId()}
          bindings={bindings()}
          onBindChange={props.onBindChange}
        />
        <CustomActionsSettings
          kind='gamepad'
          selectedGamepadId={props.selectedGamepadId()}
          selectedGamepadConnected={props.selectedGamepadConnected()}
        />
      </Show>
    )}
  </Show>
);

const GamepadSettingsContent: Component<{
  connectedGamepads: Accessor<Gamepad[]>;
  selectedGamepadId: Accessor<string | null>;
  gamepadOptions: Accessor<SelectItemOption[]>;
  selectedGamepadValue: Accessor<string[]>;
  selectedBindings: Accessor<GamepadBindings | null>;
  selectedGamepadConnected: Accessor<boolean>;
}> = (props) => (
  <div class='space-y-6'>
    <Show
      when={props.connectedGamepads().length > 0}
      fallback={
        <Empty>
          <EmptyMedia>
            <SportsEsportsIcon class='size-12 text-muted-foreground' />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{m.gamepad_no_gamepad_connected_title()}</EmptyTitle>
            <EmptyDescription>{m.gamepad_no_gamepad_connected_description()}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    >
      <GamepadSelect
        gamepadOptions={props.gamepadOptions}
        selectedGamepadValue={props.selectedGamepadValue}
        selectedGamepadId={props.selectedGamepadId}
        onSelect={(gamepadId): void => {
          setSelectedGamepad(gamepadId, props.connectedGamepads())
            .then(ignoreSetConfigResult)
            .catch(ignoreSetConfigResult);
        }}
      />
      <GamepadBindingsEditor
        selectedGamepadId={props.selectedGamepadId}
        selectedBindings={props.selectedBindings}
        selectedGamepadConnected={props.selectedGamepadConnected}
        onBindChange={(bindingKey, value): void => {
          updateGamepadBinding(props.selectedGamepadId(), bindingKey, value)
            .then(ignoreSetConfigResult)
            .catch(ignoreSetConfigResult);
        }}
      />
    </Show>
  </div>
);

const GamepadSettings: Component = () => {
  const connectedGamepads = useConnectedGamepads();
  const selectedGamepadId = useSelectedGamepadId();
  const gamepadOptions = createMemo(() => toGamepadOptions(connectedGamepads()));
  const selectedBindings = createMemo<GamepadBindings | null>(() => {
    const selectedId = selectedGamepadId();
    return hasSelectedGamepadId(selectedId)
      ? (configStore.gamepad[selectedId] ?? createNullGamepadBindings())
      : NULL_VALUE;
  });
  const selectedGamepadValue = createMemo<string[]>(() => {
    const selectedId = selectedGamepadId();
    return hasSelectedGamepadId(selectedId) ? [selectedId] : [];
  });
  const selectedGamepadConnected = createMemo(() => {
    const selectedId = selectedGamepadId();
    return hasSelectedGamepadId(selectedId)
      ? connectedGamepads().some((gamepad) => gamepad.id === selectedId)
      : false;
  });

  return (
    <GamepadSettingsContent
      connectedGamepads={connectedGamepads}
      selectedGamepadId={selectedGamepadId}
      gamepadOptions={gamepadOptions}
      selectedGamepadValue={selectedGamepadValue}
      selectedBindings={selectedBindings}
      selectedGamepadConnected={selectedGamepadConnected}
    />
  );
};

export { GamepadBindingsEditor, GamepadSelect, GamepadSettings };

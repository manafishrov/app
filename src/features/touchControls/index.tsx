import type { Component } from 'solid-js';

import { TouchAxis, getActiveGamepad, releaseTouchAxes, type TouchAxes } from '@/input';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';

import { Joystick } from './Joystick';
import { SpringSlider } from './SpringSlider';

type ClusterProps = {
  setAxis: (axis: number, value: number) => void;
};

/*
 * Whether the gamepad chosen in settings is connected. It takes over from the
 * on-screen controls; an unconfigured controller does not, since it would not
 * drive the ROV.
 */
const createGamepadActive = (): (() => boolean) => {
  const [connections, setConnections] = createSignal(0);
  const update = (): void => {
    setConnections((count) => count + 1);
  };
  globalThis.addEventListener('gamepadconnected', update);
  globalThis.addEventListener('gamepaddisconnected', update);
  onCleanup(() => {
    globalThis.removeEventListener('gamepadconnected', update);
    globalThis.removeEventListener('gamepaddisconnected', update);
  });
  return createMemo(() => {
    connections();
    return getActiveGamepad(configStore.selectedGamepadId) !== null;
  });
};

// Screen up is negative, so vertical deflection is flipped for forward and up.
const MoveCluster: Component<ClusterProps> = (props) => (
  <div class='pointer-events-auto flex flex-col items-center gap-3'>
    <SpringSlider
      orientation='vertical'
      label={m.touch_controls_heave()}
      class='h-[clamp(5rem,24vh,8rem)] w-11'
      onChange={(value) => {
        props.setAxis(TouchAxis.heave, -value);
      }}
    />
    <Joystick
      label={m.touch_controls_move()}
      class='size-(--stick-size)'
      onChange={(deflection) => {
        props.setAxis(TouchAxis.sway, deflection.horizontal);
        props.setAxis(TouchAxis.surge, -deflection.vertical);
      }}
    />
  </div>
);

const TurnCluster: Component<ClusterProps> = (props) => (
  <div class='pointer-events-auto flex flex-col items-center gap-3'>
    <SpringSlider
      orientation='horizontal'
      label={m.touch_controls_roll()}
      class='h-11 w-(--stick-size)'
      onChange={(value) => {
        props.setAxis(TouchAxis.roll, value);
      }}
    />
    <Joystick
      label={m.touch_controls_turn()}
      class='size-(--stick-size)'
      onChange={(deflection) => {
        props.setAxis(TouchAxis.yaw, deflection.horizontal);
        props.setAxis(TouchAxis.pitch, -deflection.vertical);
      }}
    />
  </div>
);

/*
 * On-screen sticks laid out like the keyboard controls: the left stick moves
 * (surge and sway) with heave above it, and the right stick turns (yaw and
 * pitch) with roll above it. They hide while the selected gamepad is connected.
 */
export const TouchControls: Component<{ axes: TouchAxes }> = (props) => {
  const gamepadActive = createGamepadActive();

  createEffect(() => {
    if (gamepadActive()) {
      releaseTouchAxes(props.axes);
    }
  });
  onCleanup(() => {
    releaseTouchAxes(props.axes);
  });

  const setAxis = (axis: number, value: number): void => {
    props.axes[axis] = value;
  };

  return (
    <Show when={!gamepadActive()}>
      <div class='pointer-events-none absolute inset-0 z-40 flex items-end justify-between pt-3 pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))]'>
        <MoveCluster setAxis={setAxis} />
        <TurnCluster setAxis={setAxis} />
      </div>
    </Show>
  );
};

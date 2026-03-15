import type { Component, JSXElement } from 'solid-js';

import { PropellerIcon } from '@/components/icons/PropellerIcon';

const BASE_ROTATION_DURATION_MS = 60_000;
const RPM_DIVISOR = 30;

const syncSpinRate = (animation: Animation | false, rpm: number): void => {
  if (animation === false) {
    return;
  }

  const absoluteRpm = Math.abs(rpm);

  if (absoluteRpm === 0) {
    animation.pause();
    return;
  }

  animation.playbackRate = absoluteRpm / RPM_DIVISOR;
  animation.play();
};

const createSpinAnimation = (element: HTMLSpanElement): Animation =>
  element.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
    duration: BASE_ROTATION_DURATION_MS,
    easing: 'linear',
    iterations: Number.POSITIVE_INFINITY,
  });

const ThrusterRpm: Component<{ rpm: number }> = (props): JSXElement => {
  const [local] = splitProps(props, ['rpm']);
  let spinnerElement: HTMLSpanElement | false = false;
  let spinAnimation: Animation | false = false;

  onMount(() => {
    if (spinnerElement === false) {
      return;
    }

    spinAnimation = createSpinAnimation(spinnerElement);
    syncSpinRate(spinAnimation, local.rpm);
  });

  createEffect(() => {
    syncSpinRate(spinAnimation, local.rpm);
  });

  onCleanup(() => {
    if (spinAnimation !== false) {
      spinAnimation.cancel();
      spinAnimation = false;
    }
  });

  return (
    <>
      {Math.round(local.rpm)}
      <span
        ref={(element) => {
          spinnerElement = element;
        }}
        class='inline-flex size-5 items-center justify-center align-middle'
        style={{
          transition: 'none',
          'transform-origin': 'center',
          'will-change': 'transform',
        }}
      >
        <PropellerIcon class='size-full' />
      </span>
    </>
  );
};

export { ThrusterRpm };

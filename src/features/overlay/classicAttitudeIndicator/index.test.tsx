// @vitest-environment happy-dom
/* oxlint-disable no-magic-numbers -- indicator sizes read clearer inline */
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, expect, it } from 'vitest';

import { ClassicAttitudeIndicator } from '.';
import { getCenter, getPitchScale } from './math';

const host = document.createElement('div');
const [undef] = [] as undefined[];
let dispose: (() => void) | undefined = undef;

afterEach(() => {
  if (dispose) {
    dispose();
  }
  host.replaceChildren();
});

/** The y position of the pitch ladder line labelled `deg`. */
const ladderLineY = (deg: number): number => {
  const label = [...host.querySelectorAll('text')].find((text) => text.textContent === String(deg));
  if (label === undef || label.parentElement === null) {
    throw new Error(`No pitch ladder label ${deg}`);
  }
  const line = label.parentElement.querySelector('line');
  if (line === null) {
    throw new Error(`No pitch ladder line for ${deg}`);
  }
  return Number(line.getAttribute('y1'));
};

it('moves the pitch ladder with the indicator when it is resized', () => {
  const [size, setSize] = createSignal(116);
  dispose = render(
    () => (
      <ClassicAttitudeIndicator
        size={size()}
        pitch={0}
        roll={0}
        yaw={0}
        desiredPitch={0}
        desiredRoll={0}
        desiredYaw={0}
        autoStabilization={false}
      />
    ),
    host,
  );
  expect(ladderLineY(10)).toBeCloseTo(getCenter(116) - 10 * getPitchScale(116));

  setSize(284);
  expect(ladderLineY(10)).toBeCloseTo(getCenter(284) - 10 * getPitchScale(284));
});

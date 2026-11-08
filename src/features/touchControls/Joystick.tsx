import type { Component } from 'solid-js';

import { cn } from '@manafishrov/ui';

import { joystickDeflection, type Deflection } from '@/input';

import { createPointerDrag } from './pointerDrag';

// How far the knob centre may travel, as a fraction of the pad radius.
const KNOB_TRAVEL = 0.6;
// Knob translation per unit of deflection, as a percentage of the knob size
// (the knob is 40% of the pad, so 60% travel of the radius is 75% of the knob).
const KNOB_OFFSET_PERCENT = 75;
const HALF = 0.5;

type JoystickProps = {
  label: string;
  class?: string;
  onChange: (deflection: Deflection) => void;
};

const CENTRED: Deflection = { horizontal: 0, vertical: 0 };

export const Joystick: Component<JoystickProps> = (props) => {
  const [deflection, setDeflection] = createSignal(CENTRED);

  const update = (deflected: Deflection): void => {
    setDeflection(deflected);
    props.onChange(deflected);
  };

  const drag = createPointerDrag(
    (event, element) => {
      const rect = element.getBoundingClientRect();
      const radius = rect.width * HALF;
      update(
        joystickDeflection(
          event.clientX - rect.left - radius,
          event.clientY - rect.top - radius,
          radius * KNOB_TRAVEL,
        ),
      );
    },
    () => {
      update(CENTRED);
    },
  );

  return (
    <div
      role='group'
      aria-label={props.label}
      class={cn(
        'relative aspect-square touch-none rounded-full border border-border/60 bg-background/30 backdrop-blur-sm',
        props.class,
      )}
      {...drag}
    >
      <div
        class='pointer-events-none absolute top-1/2 left-1/2 size-2/5 rounded-full border border-border bg-foreground/50 shadow-md'
        style={{
          transform: `translate(calc(-50% + ${deflection().horizontal * KNOB_OFFSET_PERCENT}%), calc(-50% + ${deflection().vertical * KNOB_OFFSET_PERCENT}%))`,
        }}
      />
    </div>
  );
};

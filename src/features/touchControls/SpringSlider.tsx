import type { Component } from 'solid-js';

import { cn } from '@manafishrov/ui';

import { sliderDeflection } from '@/input';

import { createPointerDrag } from './pointerDrag';

// How far the thumb centre may travel, as a fraction of half the track.
const THUMB_TRAVEL = 0.7;
const HALF = 0.5;
const PERCENT = 100;

type Orientation = 'horizontal' | 'vertical';

type SpringSliderProps = {
  label: string;
  orientation: Orientation;
  class?: string;
  // Positive is up for a vertical slider and right for a horizontal one.
  onChange: (value: number) => void;
};

const SliderTrack: Component<{ orientation: Orientation; value: number }> = (props) => {
  const isVertical = (): boolean => props.orientation === 'vertical';
  const offset = (): number => props.value * THUMB_TRAVEL * HALF * PERCENT;

  return (
    <>
      <div
        class={cn(
          'pointer-events-none absolute rounded-full bg-border/70',
          isVertical() ? 'inset-x-1/2 inset-y-3 w-px' : 'inset-x-3 inset-y-1/2 h-px',
        )}
      />
      <div
        class={cn(
          'pointer-events-none absolute aspect-square rounded-full border border-border bg-foreground/50 shadow-md',
          isVertical() ? 'inset-x-1 top-1/2' : 'inset-y-1 left-1/2',
        )}
        style={{
          transform: isVertical()
            ? `translateY(-50%) translateY(${-offset()}cqh)`
            : `translateX(-50%) translateX(${offset()}cqw)`,
        }}
      />
    </>
  );
};

/** A slider that springs back to the centre when released, like a throttle stick. */
export const SpringSlider: Component<SpringSliderProps> = (props) => {
  const [value, setValue] = createSignal(0);

  const update = (next: number): void => {
    setValue(next);
    props.onChange(next);
  };

  const drag = createPointerDrag(
    (event, element) => {
      const rect = element.getBoundingClientRect();
      const isVertical = props.orientation === 'vertical';
      const offset = isVertical
        ? rect.top + rect.height * HALF - event.clientY
        : event.clientX - rect.left - rect.width * HALF;
      const halfLength = (isVertical ? rect.height : rect.width) * HALF;
      update(sliderDeflection(offset, halfLength * THUMB_TRAVEL));
    },
    () => {
      update(0);
    },
  );

  return (
    <div
      role='group'
      aria-label={props.label}
      class={cn(
        '@container-[size] relative touch-none rounded-full border border-border/60 bg-background/30 backdrop-blur-sm',
        props.class,
      )}
      {...drag}
    >
      <SliderTrack orientation={props.orientation} value={value()} />
    </div>
  );
};

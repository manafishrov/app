import type { Component } from 'solid-js';

import type { RegulatorSuggestions } from '@/stores/rovConfig';

import * as m from '@/paraglide/messages';

import { AxisFieldset } from './AxisFieldset';

type PitchFieldsetProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppField: any;
  suggestions?: RegulatorSuggestions | null | undefined;
};

export const PitchFieldset: Component<PitchFieldsetProps> = ({ AppField, suggestions }) => (
  <AxisFieldset
    title={m.regulator_pid_pitch_title()}
    description={m.regulator_pid_pitch_description()}
    axisName='pitch'
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    AppField={AppField}
    suggestions={suggestions}
    defaultKp={5}
    defaultKi={0.5}
    defaultKd={1}
  />
);

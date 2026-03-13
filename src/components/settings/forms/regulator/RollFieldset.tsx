import type { Component } from 'solid-js';

import type { RegulatorSuggestions } from '@/stores/rovConfig';

import * as m from '@/paraglide/messages';

import { AxisFieldset } from './AxisFieldset';

type RollFieldsetProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppField: any;
  suggestions?: RegulatorSuggestions | null | undefined;
};

export const RollFieldset: Component<RollFieldsetProps> = ({ AppField, suggestions }) => (
  <AxisFieldset
    title={m.regulator_pid_roll_title()}
    description={m.regulator_pid_roll_description()}
    axisName='roll'
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    AppField={AppField}
    suggestions={suggestions}
    defaultKp={1.5}
    defaultKi={0.1}
    defaultKd={0.4}
  />
);

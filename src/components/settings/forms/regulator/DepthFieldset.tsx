import type { Component } from 'solid-js';

import type { RegulatorSuggestions } from '@/stores/rovConfig';

import * as m from '@/paraglide/messages';

import { AxisFieldset } from './AxisFieldset';

type DepthFieldsetProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppField: any;
  suggestions?: RegulatorSuggestions | null | undefined;
};

export const DepthFieldset: Component<DepthFieldsetProps> = ({ AppField, suggestions }) => (
  <AxisFieldset
    title={m.regulator_pid_depth_title()}
    description={m.regulator_pid_depth_description()}
    axisName='depth'
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    AppField={AppField}
    suggestions={suggestions}
    defaultKp={0}
    defaultKi={0.05}
    defaultKd={0.1}
  />
);

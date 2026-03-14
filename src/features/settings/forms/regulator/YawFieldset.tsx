import type { Component } from 'solid-js';

import type { RegulatorSuggestions } from '@/stores/rovConfig';

import * as m from '@/paraglide/messages';

import { AxisFieldset } from './AxisFieldset';

type YawFieldsetProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppField: any;
  suggestions?: RegulatorSuggestions | null | undefined;
};

export const YawFieldset: Component<YawFieldsetProps> = ({ AppField, suggestions }) => (
  <AxisFieldset
    title={m.regulator_direction_coefficients_yaw()}
    description={m.regulator_pid_yaw_description()}
    axisName='yaw'
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    AppField={AppField}
    suggestions={suggestions}
    defaultKp={1.5}
    defaultKi={0.1}
    defaultKd={0.4}
  />
);

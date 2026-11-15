import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';

import * as m from '@/paraglide/messages';

type FieldResetButtonProps = {
  defaultValue: number;
  onChange: (value: number) => void;
  label: string;
};

export const FieldResetButton: Component<FieldResetButtonProps> = (props) => {
  const tooltip = m.regulator_field_buttons_reset_to_default_for({ label: props.label });

  return (
    <div class='ml-4 flex gap-2'>
      <Tooltip>
        <TooltipTrigger
          asChild={(triggerProps) => (
            <Button
              {...triggerProps()}
              variant='ghost'
              aria-label={tooltip}
              onClick={() => {
                props.onChange(props.defaultValue);
              }}
            >
              {m.regulator_field_buttons_reset_to_default()}
            </Button>
          )}
        />
        <TooltipPositioner>
          <TooltipContent>
            <p>{tooltip}</p>
            <TooltipArrow />
          </TooltipContent>
        </TooltipPositioner>
      </Tooltip>
    </div>
  );
};

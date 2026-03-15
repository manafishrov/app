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

type FieldSuggestionActionsProps = {
  defaultValue: number;
  suggestionValue?: number | null | undefined;
  onChange: (value: number) => void;
  label: string;
};

type SuggestionActionButtonProps = {
  label: string;
  tooltip: string;
  variant: 'ghost' | 'outline';
  onClick: () => void;
};

const SuggestionActionButton: Component<SuggestionActionButtonProps> = (props) => (
  <Tooltip>
    <TooltipTrigger
      asChild={(triggerProps) => (
        <Button
          {...triggerProps()}
          variant={props.variant}
          aria-label={props.tooltip}
          onClick={props.onClick}
        >
          {props.label}
        </Button>
      )}
    />
    <TooltipPositioner>
      <TooltipContent>
        <p>{props.tooltip}</p>
        <TooltipArrow />
      </TooltipContent>
    </TooltipPositioner>
  </Tooltip>
);

export const FieldSuggestionActions: Component<FieldSuggestionActionsProps> = (props) => {
  const resetTooltip = m.regulator_field_buttons_reset_to_default_for({ label: props.label });

  return (
    <div class='ml-4 flex gap-2'>
      <SuggestionActionButton
        label={m.regulator_field_buttons_reset_to_default()}
        tooltip={resetTooltip}
        variant='ghost'
        onClick={() => {
          props.onChange(props.defaultValue);
        }}
      />
      {typeof props.suggestionValue === 'number' && (
        <SuggestionActionButton
          label={m.regulator_field_buttons_use_suggestion_with_value({
            value: props.suggestionValue,
          })}
          tooltip={m.regulator_field_buttons_use_suggestion_for({ label: props.label })}
          variant='outline'
          onClick={() => {
            if (typeof props.suggestionValue === 'number') {
              props.onChange(props.suggestionValue);
            }
          }}
        />
      )}
    </div>
  );
};

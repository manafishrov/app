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

// eslint-disable-next-line max-lines-per-function
export const FieldSuggestionActions: Component<FieldSuggestionActionsProps> = ({
  defaultValue,
  suggestionValue,
  onChange,
  label,
}) => (
  <div class='ml-4 flex gap-2'>
    <Tooltip>
      <TooltipTrigger
        asChild={(props) => (
          <Button
            {...props()}
            variant='ghost'
            aria-label={m.regulator_field_buttons_reset_to_default_for({ label })}
            onClick={() => {
              onChange(defaultValue);
            }}
          >
            {m.regulator_field_buttons_reset_to_default()}
          </Button>
        )}
      />
      <TooltipPositioner>
        <TooltipContent>
          <p>{m.regulator_field_buttons_reset_to_default_for({ label })}</p>
          <TooltipArrow />
        </TooltipContent>
      </TooltipPositioner>
    </Tooltip>
    {typeof suggestionValue === 'number' && (
      <Tooltip>
        <TooltipTrigger
          asChild={(props) => (
            <Button
              {...props()}
              variant='outline'
              aria-label={m.regulator_field_buttons_use_suggestion_for({ label })}
              onClick={() => {
                onChange(suggestionValue);
              }}
            >
              {m.regulator_field_buttons_use_suggestion_with_value({ value: suggestionValue })}
            </Button>
          )}
        />
        <TooltipPositioner>
          <TooltipContent>
            <p>{m.regulator_field_buttons_use_suggestion_for({ label })}</p>
            <TooltipArrow />
          </TooltipContent>
        </TooltipPositioner>
      </Tooltip>
    )}
  </div>
);

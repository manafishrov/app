import type { Component } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';

type FieldSuggestionActionsProps = {
  defaultValue: number;
  suggestionValue?: number | undefined;
  onChange: (value: number) => void;
  label: string;
};

const FieldSuggestionActions: Component<FieldSuggestionActionsProps> = ({
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
            aria-label={`Reset ${label} to default value`}
            onClick={() => onChange(defaultValue)}
          >
            Reset to Default
          </Button>
        )}
      />
      <TooltipPositioner>
        <TooltipContent>
          <p>{`Reset ${label} to default value`}</p>
          <TooltipArrow />
        </TooltipContent>
      </TooltipPositioner>
    </Tooltip>
    {suggestionValue !== undefined && (
      <Tooltip>
        <TooltipTrigger
          asChild={(props) => (
            <Button
              {...props()}
              variant='outline'
              aria-label={`Use suggested value for ${label}`}
              onClick={() => onChange(suggestionValue)}
            >
              {`Use Suggestion (${suggestionValue})`}
            </Button>
          )}
        />
        <TooltipPositioner>
          <TooltipContent>
            <p>{`Use suggested value for ${label}`}</p>
            <TooltipArrow />
          </TooltipContent>
        </TooltipPositioner>
      </Tooltip>
    )}
  </div>
);

export { FieldSuggestionActions };

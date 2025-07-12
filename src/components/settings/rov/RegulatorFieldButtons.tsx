import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

type RegulatorFieldButtonsProps = {
  defaultValue: number;
  suggestionValue?: number;
  onChange: (value: number) => void;
  label: string;
};

function RegulatorFieldButtons({
  defaultValue,
  suggestionValue,
  onChange,
  label,
}: RegulatorFieldButtonsProps) {
  return (
    <div className='ml-4 flex gap-2'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size='sm'
            variant='ghost'
            aria-label={`Reset ${label} to default value`}
            onClick={() => onChange(defaultValue)}
          >
            Reset to Default
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{`Reset ${label} to default value`}</p>
        </TooltipContent>
      </Tooltip>
      {suggestionValue && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size='sm'
              variant='outline'
              aria-label={`Use suggested value for ${label}`}
              onClick={() => onChange(suggestionValue)}
            >
              {`Use Suggestion (${suggestionValue})`}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{`Use suggested value for ${label}`}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export { RegulatorFieldButtons };

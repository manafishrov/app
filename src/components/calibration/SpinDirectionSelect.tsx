import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

function SpinDirectionSelect({
  value,
  onValueChange,
}: {
  value: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <Select
      value={value.toString()}
      onValueChange={(value) => onValueChange(Number(value))}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Default Spin Direction</SelectLabel>
          <SelectItem value={(1).toString()}>Normal</SelectItem>
          <SelectItem value={(-1).toString()}>Reversed</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export { SpinDirectionSelect };

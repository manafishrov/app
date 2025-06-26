import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

function IdentifierSelect({
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
          <SelectLabel>Thruster Identifer</SelectLabel>
          {Array.from({ length: 8 }, (_, index) => (
            <SelectItem
              key={index}
              className='text-center'
              value={(index + 1).toString()}
            >
              {index + 1}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export { IdentifierSelect };

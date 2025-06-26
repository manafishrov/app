import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

function ThrusterAllocationTable() {
  const rowLabels = [
    'Forward',
    'Side',
    'Up/Down',
    'Pitch',
    'Yaw',
    'Roll',
    'Action 1',
    'Action 2',
  ];

  return (
    <>
      <h3 className='text-2xl font-semibold tracking-tight'>
        Thruster allocation
      </h3>
      <Table className='border'>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            {Array.from({ length: 8 }, (_, index) => (
              <TableHead key={index} className='text-center'>
                {index + 1}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rowLabels.map((rowLabel) => (
            <TableRow key={rowLabel}>
              <TableCell>{rowLabel}</TableCell>
              {Array.from({ length: 8 }, (_, indexColumn) => (
                <TableCell key={`${rowLabel}-${indexColumn}`}>
                  <Input className='w-14 text-center' />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button>Update thrusters</Button>
    </>
  );
}

export { ThrusterAllocationTable };

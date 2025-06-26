import { PinSelect } from '@/components/calibration/PinSelect';
import { SpinDirectionSelect } from '@/components/calibration/SpinDirectionSelect';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

function ThrusterPinSetupTable() {
  return (
    <>
      <h3 className='text-2xl font-semibold tracking-tight'>
        Truster pin setup
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Tooltip>
                <TooltipTrigger>Identifier</TooltipTrigger>
                <TooltipContent>
                  <p>
                    Identifier to be used for the thruster in the thruster
                    allocation.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TableHead>
            <TableHead>
              <Tooltip>
                <TooltipTrigger>Pin</TooltipTrigger>
                <TooltipContent>
                  <p>
                    The general purpose pin on the Raspberry Pi Pico that the
                    thruster is connected to.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TableHead>
            <TableHead>
              <Tooltip>
                <TooltipTrigger>Spin Direction</TooltipTrigger>
                <TooltipContent>
                  <p>
                    The default spin direction for the propeller on the
                    thruster.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TableHead>
            <TableHead>
              <Tooltip>
                <TooltipTrigger>Test</TooltipTrigger>
                <TooltipContent>
                  <p>
                    Spins the thruster slowly in the specified direction on the
                    specified pin.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <PinSelect value={index} onValueChange={() => {}} />
              </TableCell>
              <TableCell>
                <SpinDirectionSelect value={1} onValueChange={() => {}} />
              </TableCell>
              <TableCell>
                <Button variant='outline'>Test</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

export { ThrusterPinSetupTable };

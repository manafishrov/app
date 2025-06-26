import { IdentifierSelect } from '@/components/calibration/IdentifierSelect';
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
  const pinNumbers = [6, 7, 8, 9, 18, 19, 20, 21];

  return (
    <>
      <h3 className='text-2xl font-semibold tracking-tight'>
        Thruster pin setup
      </h3>
      <Table className='border'>
        <TableHeader>
          <TableRow>
            <TableHead className='text-center'>
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
          {pinNumbers.map((pin, index) => (
            <TableRow key={pin}>
              <TableCell className='text-center'>GP{pin}</TableCell>
              <TableCell>
                <IdentifierSelect value={index + 1} onValueChange={() => {}} />
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

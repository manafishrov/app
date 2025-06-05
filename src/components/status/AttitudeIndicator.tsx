import { useStatus } from '@/hooks/useStatus';

function AttitudeIndicator() {
  const { data: status } = useStatus();

  if (!status?.isConnected) return null;

  const pitch = status?.pitch ?? 0;
  const roll = status?.roll ?? 0;
  const desiredPitch = status?.desiredPitch ?? 0;
  const desiredRoll = status?.desiredRoll ?? 0;

  return (
    <div className='flex flex-col items-start gap-2 overflow-hidden rounded-lg p-4 backdrop-blur-xs'>
      <div className='flex w-full justify-between text-base font-medium'>
        <div className='flex gap-6'>
          <div>
            <span className='text-muted-foreground'>Pitch: </span>
            <span className='text-primary'>{pitch.toFixed(1)}°</span>
          </div>
          <div>
            <span className='text-muted-foreground'>Roll: </span>
            <span className='text-primary'>{roll.toFixed(1)}°</span>
          </div>
        </div>
      </div>

      <div className='relative h-48 w-64'>
        <div className='absolute inset-0'>
          <div className='bg-muted-foreground/50 absolute top-1/2 left-0 h-px w-full'>
            <span className='text-muted-foreground absolute left-3 z-10 -translate-y-1/2 bg-black/70 px-1 text-xs'>
              0°
            </span>
          </div>

          <div className='bg-primary/50 absolute top-[33.33%] left-0 h-px w-full'>
            <span className='text-muted-foreground absolute left-1 z-10 -translate-y-1/2 bg-black/70 px-1 text-xs'>
              30°
            </span>
          </div>

          <div className='bg-primary/50 absolute top-[16.67%] left-0 h-px w-full'>
            <span className='text-muted-foreground absolute left-1 z-10 -translate-y-1/2 bg-black/70 px-1 text-xs'>
              60°
            </span>
          </div>

          <div className='bg-primary/50 absolute top-0 left-0 h-px w-full'>
            <span className='text-muted-foreground absolute left-1 z-10 -translate-y-1/2 bg-black/70 px-1 text-xs'>
              90°
            </span>
          </div>

          <div className='bg-primary/50 absolute top-[66.67%] left-0 h-px w-full'>
            <span className='text-muted-foreground absolute z-10 -translate-y-1/2 bg-black/70 px-1 text-xs'>
              -30°
            </span>
          </div>

          <div className='bg-primary/50 absolute top-[83.33%] left-0 h-px w-full'>
            <span className='text-muted-foreground absolute z-10 -translate-y-1/2 bg-black/70 px-1 text-xs'>
              -60°
            </span>
          </div>

          <div className='bg-primary/50 absolute bottom-0 left-0 h-px w-full'>
            <span className='text-muted-foreground absolute z-10 -translate-y-1/2 bg-black/70 px-1 text-xs'>
              -90°
            </span>
          </div>
        </div>

        <div
          className='absolute top-1/2 left-0 h-0.5 w-full origin-center bg-red-700 transition-transform'
          style={{
            transform: `
              translateY(${-desiredPitch}px)
              rotate(${desiredRoll}deg)
            `,
          }}
        >
          <div className='absolute top-0 left-1/2 h-0 w-0 -translate-x-1/2 -translate-y-2'>
            <div className='h-0 w-0 border-r-[6px] border-b-[8px] border-l-[6px] border-r-transparent border-b-red-700 border-l-transparent' />
          </div>
        </div>
        <div
          className='bg-primary absolute top-1/2 left-0 h-0.5 w-full origin-center transition-transform'
          style={{
            transform: `
              translateY(${-pitch}px)
              rotate(${roll}deg)
            `,
          }}
        >
          <div className='absolute top-0 left-1/2 h-0 w-0 -translate-x-1/2 -translate-y-2'>
            <div className='border-b-primary h-0 w-0 border-r-[6px] border-b-[8px] border-l-[6px] border-r-transparent border-l-transparent' />
          </div>
        </div>
      </div>
    </div>
  );
}

export { AttitudeIndicator };

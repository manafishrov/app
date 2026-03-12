import type { ComponentProps } from 'solid-js';

type DepthHoldIconProps = ComponentProps<'svg'> & {
  class?: string;
};

function DepthHoldIcon(props: DepthHoldIconProps) {
  return (
    <svg
      width='72'
      height='72'
      viewBox='0 0 72 72'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        fill-rule='evenodd'
        clip-rule='evenodd'
        d='M31.5829 25.8135C31.8521 26.0987 32.1092 26.3937 32.4067 26.6497C33.3983 27.5034 34.6731 28.1253 36 28.1253C37.3269 28.1253 38.6017 27.5034 39.5933 26.6497C39.8908 26.3937 40.1479 26.0987 40.4171 25.8135C40.7489 26.0789 41.0696 26.3493 41.4229 26.5848C42.7658 27.4801 44.3708 28.1253 46 28.1253V29.8753C44.0688 29.8753 42.1743 29.1592 40.5672 28.1166C39.2832 29.163 37.6748 29.8753 36 29.8753C34.3252 29.8753 32.7168 29.163 31.4328 28.1166C29.8257 29.1592 27.9312 29.8753 26 29.8753V28.1253C27.6292 28.1253 29.2342 27.4801 30.5771 26.5848C30.9301 26.3495 31.2515 26.0786 31.5829 25.8135Z'
        fill='currentColor'
      />
      <path fill-rule='evenodd' clip-rule='evenodd' d='M29 46H27V44H29V46Z' fill='currentColor' />
      <path fill-rule='evenodd' clip-rule='evenodd' d='M33 46H31V44H33V46Z' fill='currentColor' />
      <path fill-rule='evenodd' clip-rule='evenodd' d='M37 46H35V44H37V46Z' fill='currentColor' />
      <path fill-rule='evenodd' clip-rule='evenodd' d='M41 46H39V44H41V46Z' fill='currentColor' />
      <path fill-rule='evenodd' clip-rule='evenodd' d='M45 46H43V44H45V46Z' fill='currentColor' />
      <path d='M39 34H37V39.5H39L36 42.5L33 39.5H35V34H33L36 31L39 34Z' fill='currentColor' />
    </svg>
  );
}

export { DepthHoldIcon };

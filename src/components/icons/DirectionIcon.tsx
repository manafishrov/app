import type { JSX } from 'solid-js';

interface DirectionIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  class?: string;
}

function DirectionIcon(props: DirectionIconProps) {
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
        d='M41.7078 30.2922C39.7061 29.7577 37.4818 30.2756 35.9114 31.846L30.3431 37.4142L34.5858 41.6569L40.154 36.0886C41.7244 34.5182 42.2423 32.2939 41.7078 30.2922ZM39.9039 32.0961C38.9635 32.1545 38.0422 32.5436 37.3256 33.2602L33.1715 37.4142L34.5858 38.8285L38.7398 34.6744C39.4564 33.9578 39.8455 33.0365 39.9039 32.0961Z'
        fill='currentColor'
      />
      <path d='M35 43V47H37V43H35Z' fill='currentColor' />
      <path d='M29 37H25V35H29L29 37Z' fill='currentColor' />
      <path d='M35 25V29H37V25H35Z' fill='currentColor' />
      <path d='M43 37H47V35H43V37Z' fill='currentColor' />
    </svg>
  );
}

export { DirectionIcon };

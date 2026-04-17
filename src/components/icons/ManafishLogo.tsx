import type { ComponentProps, JSXElement } from 'solid-js';

type ManafishLogoProps = ComponentProps<'svg'> & {
  class?: string | undefined;
};

const ManafishLogo = (props: ManafishLogoProps): JSXElement => (
  <svg
    width='1em'
    height='1em'
    viewBox='0 0 1024 1024'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M512 833.4L166.2 633.7L166.2 234.3L512 34.6L857.8 234.3L857.8 633.7ZM512 872L135.6 220L888.4 220Z'
      stroke='currentColor'
      stroke-width='60'
    />
    <path
      d='M512 439.3L83.6 190L940.4 190ZM512 873.1L387.3 441.1L512 561L636.7 441.1ZM512 967.5L574.4 868L784 750.6L857.9 868L512 1024L166.2 868L240 750.6L449.6 868Z'
      fill='currentColor'
    />
  </svg>
);

export { ManafishLogo };

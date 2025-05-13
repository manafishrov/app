import { cx } from '@/lib/utils';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

function Input({
  ref,
  className,
  type,
  ...props
}: InputProps & {
  ref?: React.RefObject<HTMLInputElement>;
}) {
  return (
    <input
      type={type}
      className={cx(
        'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}

export { Input, type InputProps };

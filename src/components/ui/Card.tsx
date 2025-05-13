import { cx } from '@/lib/utils';

function Card({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      className={cx(
        'bg-card text-card-foreground rounded-lg border shadow-xs',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      className={cx('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  );
}

type CardTitleProps = {
  level?: 'h2' | 'h3' | 'h4';
} & React.HTMLAttributes<HTMLHeadingElement>;

function CardTitle({
  ref,
  level = 'h3',
  className,
  ...props
}: CardTitleProps & {
  ref?: React.RefObject<HTMLParagraphElement>;
}) {
  const Component = level;
  return (
    <Component
      ref={ref}
      className={cx(
        'text-2xl leading-none font-semibold tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.RefObject<HTMLParagraphElement>;
}) {
  return (
    <p
      ref={ref}
      className={cx('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CardContent({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.RefObject<HTMLDivElement>;
}) {
  return <div ref={ref} className={cx('p-6 pt-0', className)} {...props} />;
}

function CardFooter({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      className={cx('flex items-center p-6 pt-0', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};

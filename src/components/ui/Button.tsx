import { Slot } from '@radix-ui/react-slot';

import { type VariantProps, cva } from '@/lib/utils';

const buttonVariants = cva({
  base: 'focus-visible:ring-ring cursor-pointer gap-2 rounded-md text-sm whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  variants: {
    variant: {
      default:
        'bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center font-medium shadow',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center justify-center font-medium shadow-sm',
      outline:
        'border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center border font-medium shadow-sm',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center justify-center font-medium shadow-sm',
      ghost:
        'hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center font-medium',
      link: 'text-primary inline-flex items-center justify-center font-medium underline-offset-4 hover:underline',
      none: '',
    },
    size: {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-md px-8',
      icon: 'h-9 w-9',
      none: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

function Button({
  className,
  variant,
  size,
  type,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';
  const typeProp = type ?? (Comp === 'button' ? 'button' : undefined);

  return (
    <Comp
      data-slot='button'
      type={typeProp}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}

export { Button, buttonVariants };

import { Link as LinkPrimitive } from '@tanstack/react-router';

import { Button, type buttonVariants } from '@/components/ui/Button';

import type { VariantProps } from '@/lib/utils';

type LinkProps = React.ComponentPropsWithoutRef<typeof LinkPrimitive> &
  VariantProps<typeof buttonVariants>;

function Link({ className, variant, size, ...props }: LinkProps) {
  return (
    <Button className={className} variant={variant} size={size} asChild>
      <LinkPrimitive {...props} />
    </Button>
  );
}

export { Link, type LinkProps };

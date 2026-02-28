import { Link as LinkPrimitive } from '@tanstack/react-router';

import type { VariantProps } from '@/lib/utils';

import { Button, type buttonVariants } from '@/components/ui/Button';

function Link({
  className,
  variant = 'none',
  size = 'none',
  ...props
}: React.ComponentProps<typeof LinkPrimitive> & VariantProps<typeof buttonVariants>) {
  return (
    <Button className={className} variant={variant} size={size} asChild>
      <LinkPrimitive preload={false} {...props} />
    </Button>
  );
}

export { Link };

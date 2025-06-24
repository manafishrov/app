'use client';

import * as ToasterPrimitive from 'sonner';

import { useTheme } from '@/components/providers/ThemeProvider';

const toast = ToasterPrimitive.toast;

const Toaster = ({ ...props }: ToasterPrimitive.ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <ToasterPrimitive.Toaster
      theme={theme as ToasterPrimitive.ToasterProps['theme']}
      className='toaster group'
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster, toast };

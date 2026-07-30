import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('mc-button', {
  variants: {
    variant: {
      mom: 'mc-button--mom',
      care: 'mc-button--care',
      parenting: 'mc-button--parenting',
      family: 'mc-button--family',
      secondary: 'mc-button--secondary',
      ghost: 'mc-button--ghost',
      icon: 'mc-button--icon',
    },
    size: {
      sm: 'mc-button--sm',
      md: 'mc-button--md',
      lg: 'mc-button--lg',
      icon: 'mc-button--icon-size',
    },
  },
  defaultVariants: {
    variant: 'mom',
    size: 'md',
  },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('mc-badge', {
  variants: {
    tone: {
      mom: 'mc-badge--mom',
      care: 'mc-badge--care',
      parenting: 'mc-badge--parenting',
      family: 'mc-badge--family',
      neutral: '',
      success: 'mc-badge--success',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

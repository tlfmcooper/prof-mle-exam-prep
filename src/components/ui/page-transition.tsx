import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component for page transitions
 * Adds fade-in and slide-up animation when the page loads
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div
      className={cn(
        'animate-fade-in',
        className
      )}
    >
      {children}
    </div>
  );
}

interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Wrapper that staggers the animation of child elements
 */
export function StaggerChildren({ children, className, delay = 100 }: StaggerChildrenProps) {
  return (
    <div className={cn('stagger-children', className)} style={{ '--stagger-delay': `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}

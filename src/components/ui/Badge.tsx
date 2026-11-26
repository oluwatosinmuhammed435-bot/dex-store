import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'brand';

export interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, { container: string; dot: string }> = {
  success: {
    container: 'bg-[#EAF5EE] text-[#123D2A] border-[#C6E5D2]',
    dot: 'bg-[#279B62]',
  },
  warning: {
    container: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  danger: {
    container: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  neutral: {
    container: 'bg-[#F2F6F3] text-[#5C6B62] border-[#E2EAE5]',
    dot: 'bg-[#7B8A80]',
  },
  brand: {
    container: 'bg-[#D9F0E2] text-[#0E3021] border-[#B8DCC5]',
    dot: 'bg-[#176B45]',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  dot = false,
  children,
  className = '',
}) => {
  const styles = VARIANT_STYLES[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${styles.container} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} aria-hidden="true" />}
      {children}
    </span>
  );
};

export function getAvailabilityBadgeVariant(availability: string): BadgeVariant {
  if (availability === 'In Stock') return 'success';
  if (availability === 'Available on Order') return 'warning';
  return 'danger';
}

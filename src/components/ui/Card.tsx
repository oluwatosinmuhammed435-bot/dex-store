import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const PADDING_MAP = {
  none: '',
  sm: 'p-3.5',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  padding = 'md',
  className = '',
}) => {
  return (
    <div
      className={`bg-[#FFFFFF] border border-[#E2EAE5] rounded-2xl shadow-xs ${
        interactive ? 'dex-card-interactive' : ''
      } ${PADDING_MAP[padding]} ${className}`}
    >
      {children}
    </div>
  );
};

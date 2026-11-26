import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'soft' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#176B45] text-[#FFFFFF] hover:bg-[#123D2A] border border-transparent shadow-xs',
  soft:
    'bg-[#EAF5EE] text-[#123D2A] hover:bg-[#D9F0E2] border border-[#C6E5D2]',
  outline:
    'bg-[#FFFFFF] text-[#17231C] hover:bg-[#F7FAF8] hover:border-[#B8DCC5] border border-[#E2EAE5]',
  ghost:
    'bg-transparent text-[#5C6B62] hover:bg-[#EAF5EE]/70 hover:text-[#123D2A] border border-transparent',
  danger:
    'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'min-h-[44px] px-4 py-2.5 text-xs sm:text-sm rounded-xl gap-2',
  lg: 'min-h-[48px] px-5 py-3 text-sm rounded-xl gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  children,
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-semibold dex-press select-none disabled:opacity-50 disabled:cursor-not-allowed ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0 inline-flex">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0 inline-flex">{rightIcon}</span>}
    </button>
  );
};

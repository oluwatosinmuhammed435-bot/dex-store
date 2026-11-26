import React from 'react';

interface BaseFieldProps {
  label?: string;
  helperText?: string;
  error?: string;
  requiredMark?: boolean;
  id?: string;
}

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'>,
    BaseFieldProps {
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  requiredMark,
  id,
  leftIcon,
  className = '',
  ...props
}) => {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={fieldId} className="block text-xs sm:text-sm font-semibold text-[#17231C]">
          {label} {requiredMark && <span className="text-red-600">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7B8A80] pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={fieldId}
          className={`w-full ${leftIcon ? 'pl-10' : 'px-3.5'} pr-3.5 py-2.5 bg-[#FFFFFF] border rounded-xl text-sm text-[#17231C] placeholder:text-[#7B8A80] min-h-[44px] transition-colors focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
              : 'border-[#E2EAE5] hover:border-[#C7D8CD] focus:border-[#176B45] focus:ring-[#279B62]/20'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      {!error && helperText && <p className="text-[11px] text-[#5C6B62]">{helperText}</p>}
    </div>
  );
};

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>,
    BaseFieldProps {}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  helperText,
  error,
  requiredMark,
  id,
  className = '',
  ...props
}) => {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={fieldId} className="block text-xs sm:text-sm font-semibold text-[#17231C]">
          {label} {requiredMark && <span className="text-red-600">*</span>}
        </label>
      )}
      <textarea
        id={fieldId}
        className={`w-full px-3.5 py-2.5 bg-[#FFFFFF] border rounded-xl text-sm text-[#17231C] placeholder:text-[#7B8A80] transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
            : 'border-[#E2EAE5] hover:border-[#C7D8CD] focus:border-[#176B45] focus:ring-[#279B62]/20'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      {!error && helperText && <p className="text-[11px] text-[#5C6B62]">{helperText}</p>}
    </div>
  );
};

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'>,
    BaseFieldProps {}

export const Select: React.FC<SelectProps> = ({
  label,
  helperText,
  error,
  requiredMark,
  id,
  className = '',
  children,
  ...props
}) => {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={fieldId} className="block text-xs sm:text-sm font-semibold text-[#17231C]">
          {label} {requiredMark && <span className="text-red-600">*</span>}
        </label>
      )}
      <select
        id={fieldId}
        className={`w-full px-3.5 py-2.5 bg-[#FFFFFF] border rounded-xl text-sm text-[#17231C] min-h-[44px] transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
            : 'border-[#E2EAE5] hover:border-[#C7D8CD] focus:border-[#176B45] focus:ring-[#279B62]/20'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      {!error && helperText && <p className="text-[11px] text-[#5C6B62]">{helperText}</p>}
    </div>
  );
};

'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-full focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none';

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)] border border-transparent shadow-md shadow-teal-700/20 hover:shadow-lg hover:shadow-teal-700/30 active:scale-98',
    secondary:
      'bg-teal-50 text-[var(--brand)] hover:bg-teal-100 border border-teal-200/60 shadow-xs hover:shadow-sm active:scale-98',
    outline:
      'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs hover:border-slate-300 active:scale-98',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent',
    danger:
      'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/60 shadow-xs active:scale-98',
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[32px]',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2 min-h-[40px]',
    lg: 'text-sm font-bold px-6 py-2.5 gap-2.5 min-h-[48px]',
    icon: 'p-2 min-w-[36px] min-h-[36px] aspect-square rounded-full',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children && <span>{children}</span>}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

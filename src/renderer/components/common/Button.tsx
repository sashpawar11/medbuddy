import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'destructive-solid';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  children,
  className = '',
  ...props
}) => {
  // Height & typography per §9.1
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-7 px-2.5 text-small gap-1.5',
    md: 'h-[34px] px-3 text-body gap-2',
    lg: 'h-10 px-4 text-body-medium gap-2',
  };

  // Color & border treatments per §9.1
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-vault-600 text-white hover:bg-vault-700 active:bg-vault-700 shadow-xs border border-transparent font-medium',
    secondary:
      'bg-surface text-primary border border-border hover:bg-surface-hover active:bg-surface-hover font-medium',
    ghost:
      'bg-transparent text-primary hover:bg-surface-hover active:bg-surface-hover border border-transparent',
    destructive:
      'bg-surface text-clay-600 border border-clay-300 hover:bg-clay-100 active:bg-clay-100 font-medium',
    'destructive-solid':
      'bg-clay-600 text-white hover:bg-clay-600/90 active:bg-clay-600/95 font-medium border border-transparent',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-sm select-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-vault-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" strokeWidth={1.75} />
      ) : icon ? (
        <span className="shrink-0 flex items-center">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

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
  // Height & typography per design taste guidelines
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-7 px-2.5 text-small gap-1.5',
    md: 'h-[34px] px-3.5 text-body gap-2',
    lg: 'h-10 px-4 text-body-medium gap-2',
  };

  // Color & border treatments with dark mode adaptation & tactile feedback
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-vault-600 dark:bg-vault-500 text-white hover:bg-vault-700 dark:hover:bg-vault-400 active:bg-vault-800 shadow-xs border border-transparent font-medium active:scale-[0.98]',
    secondary:
      'bg-surface text-primary border border-border hover:bg-surface-hover hover:border-border-strong active:bg-surface-recessed font-medium shadow-2xs active:scale-[0.98]',
    ghost:
      'bg-transparent text-secondary hover:text-primary hover:bg-surface-hover active:bg-surface-recessed border border-transparent active:scale-[0.98]',
    destructive:
      'bg-surface text-clay-600 dark:text-clay-400 border border-clay-300 dark:border-clay-700 hover:bg-clay-50 dark:hover:bg-clay-950/50 font-medium active:scale-[0.98]',
    'destructive-solid':
      'bg-clay-600 text-white hover:bg-clay-700 active:bg-clay-800 font-medium border border-transparent active:scale-[0.98]',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-md select-none transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-vault-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
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
